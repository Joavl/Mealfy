using Mealfy.Api.Middleware;
using Mealfy.Infrastructure;
using Mealfy.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(port))
{
    builder.WebHost.UseUrls($"http://+:{port}");
}

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddInfrastructure(builder.Configuration);

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy
            .SetIsOriginAllowed(_ => true)
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
    {
        await db.Database.EnsureCreatedAsync();
        await EnsureFamilyColumnsAsync(db);
    }

    await DbSeeder.SeedAsync(db);
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();
app.UseMiddleware<ApiExceptionMiddleware>();
app.UseMiddleware<UserIdAuthMiddleware>();
app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "ok", api = "aspnet", timestamp = DateTime.UtcNow }));

app.Run();

static async Task EnsureFamilyColumnsAsync(MealfyDbContext db)
{
    var alters = new[]
    {
        "ALTER TABLE Families ADD COLUMN FamilyName TEXT",
        "ALTER TABLE Families ADD COLUMN ResponsibleCpf TEXT",
        "ALTER TABLE Families ADD COLUMN ChildrenNamesJson TEXT",
        "ALTER TABLE Families ADD COLUMN PhotoUrl TEXT",
        "ALTER TABLE Families ADD COLUMN Description TEXT",
        "ALTER TABLE Families ADD COLUMN ShortAddress TEXT",
        "ALTER TABLE Families ADD COLUMN MainNeed TEXT",
        "ALTER TABLE Families ADD COLUMN PriorityLevel INTEGER NOT NULL DEFAULT 3",
        "ALTER TABLE Families ADD COLUMN NeedsEntitySupport INTEGER NOT NULL DEFAULT 0",
    };
    foreach (var sql in alters)
    {
        try { await db.Database.ExecuteSqlRawAsync(sql); } catch { /* coluna já existe */ }
    }
}
