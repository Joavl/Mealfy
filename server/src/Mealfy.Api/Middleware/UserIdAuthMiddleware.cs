namespace Mealfy.Api.Middleware;

/// <summary>
/// Compatível com o front atual (header x-user-id). Substituível por JWT/Firebase depois.
/// </summary>
public class UserIdAuthMiddleware
{
    private readonly RequestDelegate _next;

    public UserIdAuthMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context)
    {
        if (context.Request.Headers.TryGetValue("x-user-id", out var userId) &&
            Guid.TryParse(userId, out var guid))
        {
            context.Items["UserId"] = guid.ToString();
        }

        await _next(context);
    }
}
