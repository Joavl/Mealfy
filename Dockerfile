# API Mealfy — deploy em Render, Railway, Fly.io, etc.
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY server/src/Mealfy.Api/Mealfy.Api.csproj server/src/Mealfy.Api/
COPY server/src/Mealfy.Application/Mealfy.Application.csproj server/src/Mealfy.Application/
COPY server/src/Mealfy.Domain/Mealfy.Domain.csproj server/src/Mealfy.Domain/
COPY server/src/Mealfy.Infrastructure/Mealfy.Infrastructure.csproj server/src/Mealfy.Infrastructure/

RUN dotnet restore server/src/Mealfy.Api/Mealfy.Api.csproj

COPY server/ server/

RUN dotnet publish server/src/Mealfy.Api/Mealfy.Api.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app

RUN mkdir -p /app/data

COPY --from=build /app/publish .

ENV ASPNETCORE_ENVIRONMENT=Production
ENV Database__Provider=Sqlite
ENV ConnectionStrings__DefaultConnection=Data Source=/app/data/mealfy.db

EXPOSE 8080

ENTRYPOINT ["dotnet", "Mealfy.Api.dll"]
