using Mealfy.Api.Middleware;
using Mealfy.Infrastructure;
using Mealfy.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddInfrastructure(builder.Configuration);

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy
            .WithOrigins(
                "http://localhost:5173",
                "http://localhost:5174",
                "http://localhost:5175",
                "http://localhost:5176",
                "http://localhost:8081")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<MealfyDbContext>();
    var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();
    var provider = config["Database:Provider"] ?? "Sqlite";

    if (provider.Equals("SqlServer", StringComparison.OrdinalIgnoreCase))
        await db.Database.MigrateAsync();
    else
        await db.Database.EnsureCreatedAsync();

    await DbSeeder.SeedAsync(db);
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();
app.UseMiddleware<UserIdAuthMiddleware>();
app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "ok", api = "aspnet", timestamp = DateTime.UtcNow }));

app.Run();
