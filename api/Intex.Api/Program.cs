using System.Text;
using System.Text.Json;
using Intex.Api.Auth;
using Intex.Api.Data;
using Intex.Api.Diagnostics;
using Intex.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddHttpContextAccessor();
builder.Services.AddProblemDetails();
builder.Services.AddControllers().AddJsonOptions(o =>
{
    o.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    o.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
});
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection("Jwt"));
builder.Services.AddSingleton<TokenService>();
builder.Services.AddScoped<LighthouseCsvImportService>();

builder.Services.AddDbContext<AppDbContext>(options =>
{
    var conn = builder.Configuration.GetConnectionString("AppDb");
    options.UseSqlServer(conn);
});

builder.Services
    .AddIdentityCore<AppUser>(options =>
    {
        var pwd = builder.Configuration.GetSection("Identity:Password");
        options.Password.RequiredLength = pwd.GetValue("RequiredLength", 12);
        options.Password.RequireDigit = pwd.GetValue("RequireDigit", true);
        options.Password.RequireLowercase = pwd.GetValue("RequireLowercase", true);
        options.Password.RequireUppercase = pwd.GetValue("RequireUppercase", true);
        options.Password.RequireNonAlphanumeric = pwd.GetValue("RequireNonAlphanumeric", true);
        options.Password.RequiredUniqueChars = pwd.GetValue("RequiredUniqueChars", 4);

        options.Lockout.MaxFailedAccessAttempts = 8;
        options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(10);
    })
    .AddRoles<IdentityRole>()
    .AddEntityFrameworkStores<AppDbContext>()
    .AddSignInManager();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        var jwt = builder.Configuration.GetSection("Jwt").Get<JwtOptions>() ?? new JwtOptions();
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwt.Issuer,
            ValidAudience = jwt.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key))
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy(AppPolicies.StaffOnly, policy =>
        policy.RequireRole(AppRoles.Admin, AppRoles.Employee));
});

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        var origins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
        policy
            .WithOrigins(origins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();

// Never throw here: a missing/short Jwt__Key on Azure would stop the entire process (HTTP 500.30) with no /health.
// Login/register still require Jwt__Key >= 32 bytes (see TokenService); we only log so you can fix App Service settings.
{
    var jwtKey = app.Configuration["Jwt:Key"] ?? "";
    if (Encoding.UTF8.GetByteCount(jwtKey) < 32)
    {
        app.Logger.LogCritical(
            "Jwt:Key is missing or shorter than 32 bytes. Set Jwt__Key in Azure Application Settings to a random string of at least 32 characters, or login/register will return HTTP 500 when issuing tokens.");
    }
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}
else
{
    app.UseHsts();
}

app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        var ex = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>()?.Error;
        if (ex is not null)
        {
            app.Logger.LogError(ex, "Unhandled exception. TraceId={TraceId}", context.TraceIdentifier);
        }

        var problem = Results.Problem(
            title: "Unexpected error",
            statusCode: StatusCodes.Status500InternalServerError,
            extensions: new Dictionary<string, object?> { ["traceId"] = context.TraceIdentifier }
        );

        await problem.ExecuteAsync(context);
    });
});

app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedProto | ForwardedHeaders.XForwardedFor
});

app.UseHttpsRedirection();

app.Use(async (context, next) =>
{
    // Correlation ID for faster debugging across client ↔ API ↔ DB issues.
    const string header = "X-Correlation-Id";
    if (!context.Request.Headers.TryGetValue(header, out var incoming) || string.IsNullOrWhiteSpace(incoming))
    {
        context.Response.Headers[header] = context.TraceIdentifier;
    }
    else
    {
        context.Response.Headers[header] = incoming.ToString();
    }

    var sw = System.Diagnostics.Stopwatch.StartNew();
    try
    {
        await next();
    }
    finally
    {
        sw.Stop();
        app.Logger.LogInformation(
            "{Method} {Path} -> {Status} ({ElapsedMs}ms) TraceId={TraceId}",
            context.Request.Method,
            context.Request.Path.Value,
            context.Response.StatusCode,
            sw.ElapsedMilliseconds,
            context.TraceIdentifier
        );
    }
});

app.UseCors();

// Ensure anonymous login/register are never pre-empted by a bad Bearer token (browser extensions, old clients).
app.Use(async (context, next) =>
{
    if (HttpMethods.IsPost(context.Request.Method))
    {
        var p = context.Request.Path;
        if (p.StartsWithSegments("/api/auth/login") || p.StartsWithSegments("/api/auth/register-donor"))
        {
            context.Request.Headers.Remove("Authorization");
        }
    }

    await next();
});

app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/health", (HttpContext ctx) =>
    Results.Ok(new { status = "ok", traceId = ctx.TraceIdentifier }));
app.MapGet("/health/info", async (IConfiguration config, IServiceProvider sp) =>
{
    var conn = config.GetConnectionString("AppDb");
    var hasConn = !string.IsNullOrWhiteSpace(conn);
    var corsOrigins = config.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
    var jwtKey = config["Jwt:Key"] ?? "";
    var jwtKeyUtf8Bytes = Encoding.UTF8.GetByteCount(jwtKey);
    static bool SeedPair(IConfiguration c, string emailKey, string pwdKey) =>
        !string.IsNullOrWhiteSpace(c[$"Seed:{emailKey}"]) && !string.IsNullOrWhiteSpace(c[$"Seed:{pwdKey}"]);

    var seedAdminOk = SeedPair(config, "AdminEmail", "AdminPassword");
    int? aspNetUserCount = null;
    try
    {
        await using var scope = sp.CreateAsyncScope();
        var um = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
        aspNetUserCount = await um.Users.CountAsync();
    }
    catch
    {
        // DB unavailable — leave null
    }

    return Results.Ok(new
    {
        status = "ok",
        environment = app.Environment.EnvironmentName,
        hasConnectionString = hasConn,
        corsAllowedOrigins = corsOrigins,
        jwtKeyUtf8Bytes,
        jwtKeyConfigured = jwtKeyUtf8Bytes >= 32,
        databaseAutoMigrate = config.GetValue("Database:AutoMigrate", true),
        seedAdminCredentialsConfigured = seedAdminOk,
        seedEmployeeCredentialsConfigured = SeedPair(config, "EmployeeEmail", "EmployeePassword"),
        seedDonorCredentialsConfigured = SeedPair(config, "DonorEmail", "DonorPassword"),
        aspNetUserCount,
        seedAdminConfiguredButNoUsers = seedAdminOk && aspNetUserCount == 0,
        identityPasswordRequiredLength = config.GetValue("Identity:Password:RequiredLength", 12),
        lighthouseAutoImportIfEmpty = config.GetValue("LighthouseImport:AutoImportIfEmpty", true),
        nowUtc = DateTime.UtcNow
    });
});
app.MapGet("/health/db", async (IServiceProvider services) =>
{
    try
    {
        await using var scope = services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var ok = await db.Database.CanConnectAsync();
        return ok
            ? Results.Ok(new { status = "ok" })
            : Results.Problem("Database unavailable.", statusCode: StatusCodes.Status503ServiceUnavailable);
    }
    catch (Exception ex)
    {
        app.Logger.LogError(ex, "Health check failed: DB unavailable.");
        if (app.Environment.IsDevelopment())
        {
            return Results.Json(new
            {
                status = "error",
                message = "Database unavailable.",
                exception = ex.GetType().FullName,
                detail = ex.Message,
                inner = ex.InnerException?.Message
            }, statusCode: StatusCodes.Status503ServiceUnavailable);
        }
        // In production return a trace id so we can immediately find the matching server log line.
        var traceId = services.GetService<IHttpContextAccessor>()?.HttpContext?.TraceIdentifier;
        return Results.Problem(
            detail: "Database unavailable.",
            statusCode: StatusCodes.Status503ServiceUnavailable,
            extensions: new Dictionary<string, object?> { ["traceId"] = traceId }
        );
    }
});

app.MapGet("/health/migrations", async (IServiceProvider sp) =>
{
    await using var scope = sp.CreateAsyncScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var applied = await db.Database.GetAppliedMigrationsAsync();
    var pending = await db.Database.GetPendingMigrationsAsync();
    var appliedList = applied.ToArray();
    var pendingList = pending.ToArray();
    return Results.Ok(new
    {
        status = "ok",
        applied = appliedList,
        pending = pendingList,
        pendingCount = pendingList.Length,
        ready = pendingList.Length == 0,
        startupMigrate = new
        {
            outcome = StartupMigrationDiagnostics.Outcome,
            error = StartupMigrationDiagnostics.ErrorMessage
        }
    });
});

app.MapGet("/health/schema", async (IServiceProvider sp) =>
{
    string[] tables =
    [
        "AspNetUsers", "AspNetRoles", "AspNetUserRoles", "AspNetRoleClaims", "AspNetUserClaims",
        "AspNetUserLogins", "AspNetUserTokens", "Supporters", "Residents", "Contributions", "Safehouses"
    ];
    await using var scope = sp.CreateAsyncScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var conn = db.Database.GetDbConnection();
    await conn.OpenAsync();
    try
    {
        var dict = new Dictionary<string, bool>(StringComparer.Ordinal);
        foreach (var t in tables)
        {
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = "SELECT CASE WHEN OBJECT_ID(@fqn, N'U') IS NOT NULL THEN 1 ELSE 0 END";
            var p = cmd.CreateParameter();
            p.ParameterName = "@fqn";
            p.Value = $"dbo.{t}";
            cmd.Parameters.Add(p);
            var n = Convert.ToInt32(await cmd.ExecuteScalarAsync());
            dict[t] = n == 1;
        }

        int? aspNetUserCount = null;
        if (dict["AspNetUsers"])
        {
            await using var countCmd = conn.CreateCommand();
            countCmd.CommandText = "SELECT CAST(COUNT(*) AS int) FROM dbo.AspNetUsers";
            aspNetUserCount = Convert.ToInt32(await countCmd.ExecuteScalarAsync());
        }

        return Results.Ok(new
        {
            status = "ok",
            tables = dict,
            allCoreTablesPresent = dict["AspNetUsers"] && dict["AspNetRoles"] && dict["Supporters"],
            aspNetUserCount
        });
    }
    finally
    {
        await conn.CloseAsync();
    }
});

app.MapControllers();

if (app.Configuration.GetValue("Database:AutoMigrate", true))
{
    await using (var migrateScope = app.Services.CreateAsyncScope())
    {
        var migrateLog = migrateScope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("Migrations");
        var db = migrateScope.ServiceProvider.GetRequiredService<AppDbContext>();
        try
        {
            var pending = await db.Database.GetPendingMigrationsAsync();
            migrateLog.LogInformation(
                "Applying EF Core migrations. Pending: {Count} ({Names})",
                pending.Count(),
                string.Join(", ", pending));
            await db.Database.MigrateAsync();
            migrateLog.LogInformation("EF Core migrations completed.");
            StartupMigrationDiagnostics.Outcome = StartupMigrationDiagnostics.OutcomeOk;
            StartupMigrationDiagnostics.ErrorMessage = null;
        }
        catch (Exception ex)
        {
            var pendingNames = "";
            try
            {
                pendingNames = string.Join(", ", await db.Database.GetPendingMigrationsAsync());
            }
            catch
            {
                pendingNames = "(could not read pending list)";
            }

            StartupMigrationDiagnostics.SetFailed(ex);

            // Do not rethrow: a failed MigrateAsync would stop the host entirely (Azure HTTP 500.30) and hide /health endpoints.
            migrateLog.LogCritical(
                ex,
                "MigrateAsync failed — API is starting without a guaranteed schema. Run cleanup SQL in docs/azure-deploy.md if you see only __EFMigrationsHistory + ImpactAllocations, then restart. Pending migrations: {Pending}",
                pendingNames);
        }
    }
}
else
{
    StartupMigrationDiagnostics.Outcome = StartupMigrationDiagnostics.OutcomeSkipped;
    StartupMigrationDiagnostics.ErrorMessage = null;
}

if (StartupMigrationDiagnostics.Outcome == StartupMigrationDiagnostics.OutcomeOk
    || StartupMigrationDiagnostics.Outcome == StartupMigrationDiagnostics.OutcomeSkipped)
{
    try
    {
        await LighthouseStartupImport.TryAutoImportIfEmptyAsync(app.Services, app.Configuration, app.Logger);
    }
    catch (Exception ex)
    {
        app.Logger.LogError(ex, "Lighthouse CSV auto-import failed with an unexpected error.");
    }
}

if (app.Configuration.GetValue("Database:AutoMigrate", true))
{
    try
    {
        await SeedData.EnsureSeededAsync(app.Services, app.Configuration);
    }
    catch (Exception ex)
    {
        app.Logger.LogError(ex, "Database seed failed (roles/users/demo). API may be partially usable.");
    }
}

app.Run();
