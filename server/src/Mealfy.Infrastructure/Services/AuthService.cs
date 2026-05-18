using Mealfy.Application.Abstractions;
using Mealfy.Application.Contracts.Auth;
using Mealfy.Application.Contracts.Users;
using Mealfy.Application.Mapping;
using Mealfy.Domain.Entities;
using Mealfy.Domain.Enums;
using Mealfy.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Mealfy.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly MealfyDbContext _db;
    private readonly IFirebaseTokenVerifier _firebase;

    public AuthService(MealfyDbContext db, IFirebaseTokenVerifier firebase)
    {
        _db = db;
        _firebase = firebase;
    }

    public async Task<UserDto> RegisterDonorAsync(RegisterDonorRequest request, CancellationToken ct = default)
    {
        if (await _db.Users.AnyAsync(u => u.Email == request.Email, ct))
            throw new InvalidOperationException("Email already registered");

        var user = new User
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Email = request.Email,
            Role = UserRole.Donor,
            Status = AccountStatus.Active,
            Phone = request.Phone,
            DocumentType = request.DocumentType,
            DocumentNumber = request.DocumentNumber,
            Instagram = request.Instagram,
            ShowOnRanking = request.ShowOnRanking,
            ShowInstagram = request.ShowInstagram,
            AnonymousMode = request.AnonymousMode,
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync(ct);
        return UserMapper.ToDto(user);
    }

    public async Task<UserDto> RegisterEntityAsync(RegisterEntityRequest request, CancellationToken ct = default)
    {
        if (await _db.Users.AnyAsync(u => u.Email == request.Email, ct))
            throw new InvalidOperationException("Email already registered");

        var entityId = Guid.NewGuid();
        var entity = new AuthorizingEntity
        {
            Id = entityId,
            Name = request.Name,
            Cnpj = request.Cnpj,
            Type = UserMapper.ParseEntityType(request.Type),
            ResponsibleName = request.ResponsibleName,
            Email = request.Email,
            Phone = request.Phone,
            Region = request.Region,
            Status = AccountStatus.Pending,
        };

        var user = new User
        {
            Id = Guid.NewGuid(),
            Name = request.ResponsibleName,
            Email = request.Email,
            Role = UserRole.Entity,
            Status = AccountStatus.Pending,
            EntityId = entityId,
            Phone = request.Phone,
        };

        _db.Entities.Add(entity);
        _db.Users.Add(user);
        await _db.SaveChangesAsync(ct);
        return UserMapper.ToDto(user);
    }

    public async Task<LoginResponse> LoginMockAsync(string email, CancellationToken ct = default)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email, ct)
            ?? throw new InvalidOperationException("Invalid credentials");

        return new LoginResponse(user.Id.ToString(), UserMapper.ToDto(user));
    }

    public async Task<LoginResponse> LoginWithFirebaseAsync(string idToken, CancellationToken ct = default)
    {
        var claims = await _firebase.VerifyAsync(idToken, ct);
        var user = await _db.Users.FirstOrDefaultAsync(u => u.FirebaseUid == claims.Uid || u.Email == claims.Email, ct);

        if (user is null)
        {
            user = new User
            {
                Id = Guid.NewGuid(),
                Name = claims.Name ?? claims.Email.Split('@')[0],
                Email = claims.Email,
                Role = UserRole.Donor,
                Status = AccountStatus.Active,
                FirebaseUid = claims.Uid,
            };
            _db.Users.Add(user);
            await _db.SaveChangesAsync(ct);
        }
        else if (string.IsNullOrEmpty(user.FirebaseUid))
        {
            user.FirebaseUid = claims.Uid;
            await _db.SaveChangesAsync(ct);
        }

        return new LoginResponse(user.Id.ToString(), UserMapper.ToDto(user));
    }

    public async Task<UserDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id, ct);
        return user is null ? null : UserMapper.ToDto(user);
    }
}
