using System.Text;
using Intex.Api.Auth;
using Intex.Api.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection("Jwt"));
builder.Services.AddSingleton<TokenService>();

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

builder.Services.AddAuthorization();

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

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}
else
{
    app.UseHsts();
}

app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedProto | ForwardedHeaders.XForwardedFor
});

app.UseHttpsRedirection();

app.UseCors();

app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
app.MapGet("/health/info", () =>
{
    var conn = app.Configuration.GetConnectionString("AppDb");
    var hasConn = !string.IsNullOrWhiteSpace(conn);
    var corsOrigins = app.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
    return Results.Ok(new
    {
        status = "ok",
        environment = app.Environment.EnvironmentName,
        hasConnectionString = hasConn,
        corsAllowedOrigins = corsOrigins,
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
        return Results.Problem("Database unavailable.", statusCode: StatusCodes.Status503ServiceUnavailable);
    }
});

app.MapControllers();

if (app.Configuration.GetValue("Database:AutoMigrate", true))
{
    try
    {
        await SeedData.EnsureSeededAsync(app.Services, app.Configuration);
    }
    catch (Exception ex)
    {
        app.Logger.LogError(ex, "Database migration/seed failed. API will start in degraded mode.");
    }
}

app.Run();
