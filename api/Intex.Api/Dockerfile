FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["api/Intex.Api/Intex.Api.csproj", "api/Intex.Api/"]
RUN dotnet restore "api/Intex.Api/Intex.Api.csproj"

COPY . .
RUN dotnet publish "api/Intex.Api/Intex.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "Intex.Api.dll"]
