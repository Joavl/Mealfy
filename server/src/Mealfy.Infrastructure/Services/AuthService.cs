using System.Text.Json;
using Mealfy.Application.Abstractions;
using Mealfy.Application.Contracts.Auth;
using Mealfy.Application.Contracts.Families;
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
    private readonly IFamilyService _families;
    private readonly IFirestoreCadastroService _firestore;

    public AuthService(
        MealfyDbContext db,
        IFirebaseTokenVerifier firebase,
        IFamilyService families,
        IFirestoreCadastroService firestore)
    {
        _db = db;
        _firebase = firebase;
        _families = families;
        _firestore = firestore;
    }

    public async Task<UserDto> RegisterDonorAsync(RegisterDonorRequest request, CancellationToken ct = default)
    {
        if (await _db.Users.AnyAsync(u => u.Email == request.Email, ct))
            throw new InvalidOperationException("Email already registered");

        string? firebaseUid = null;
        if (!string.IsNullOrWhiteSpace(request.IdToken))
        {
            var claims = await _firebase.VerifyAsync(request.IdToken, ct);
            if (!string.Equals(claims.Email, request.Email, StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException("E-mail do token Firebase não confere com o cadastro.");
            firebaseUid = claims.Uid;
            if (await _db.Users.AnyAsync(u => u.FirebaseUid == firebaseUid, ct))
                throw new InvalidOperationException("Conta Firebase já vinculada.");
        }

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
            FirebaseUid = firebaseUid,
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync(ct);
        var dto = UserMapper.ToDto(user);
        await _firestore.SaveUserAsync(user.Id.ToString(), dto, ct);
        return dto;
    }

    public async Task<UserDto> RegisterEntityAsync(RegisterEntityRequest request, CancellationToken ct = default)
    {
        if (await _db.Users.AnyAsync(u => u.Email == request.Email, ct))
            throw new InvalidOperationException("Email already registered");

        string? firebaseUid = null;
        if (!string.IsNullOrWhiteSpace(request.IdToken))
        {
            var claims = await _firebase.VerifyAsync(request.IdToken, ct);
            if (!string.Equals(claims.Email, request.Email, StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException("E-mail do token Firebase não confere com o cadastro.");
            firebaseUid = claims.Uid;
        }

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
            FirebaseUid = firebaseUid,
        };

        _db.Entities.Add(entity);
        _db.Users.Add(user);
        await _db.SaveChangesAsync(ct);

        await _firestore.SaveEntityAsync(entityId.ToString(), new
        {
            id = entityId.ToString(),
            entity.Name,
            entity.Cnpj,
            type = request.Type,
            entity.ResponsibleName,
            entity.Email,
            entity.Phone,
            entity.Region,
            status = "pending",
            createdAt = DateTime.UtcNow.ToString("O"),
        }, ct);

        var userDto = UserMapper.ToDto(user);
        await _firestore.SaveUserAsync(user.Id.ToString(), userDto, ct);
        return userDto;
    }

    public async Task<RegisterBeneficiaryResponse> RegisterBeneficiaryAsync(RegisterBeneficiaryRequest request, CancellationToken ct = default)
    {
        var cpf = new string(request.ResponsibleCpf.Where(char.IsDigit).ToArray());
        if (cpf.Length < 11) throw new InvalidOperationException("CPF inválido");

        if (await _db.Users.AnyAsync(u => u.DocumentNumber == cpf, ct))
            throw new InvalidOperationException("CPF já cadastrado");

        var (lat, lng) = FamilyService.CoordsForRegion(request.Region);
        var childrenJson = JsonSerializer.Serialize(request.ChildrenNames);

        var family = await _families.CreateAsync(new CreateFamilyRequest(
            request.FamilyName,
            request.Region,
            request.ChildrenCount,
            lat,
            lng,
            request.Neighborhood ?? request.Region,
            "São Paulo",
            "SP",
            request.ShortAddress ?? request.Neighborhood ?? request.Region,
            $"Família {request.FamilyName}, responsável {request.ResponsibleName}.",
            "Alimentação básica",
            request.FamilyName,
            cpf,
            childrenJson,
            request.PhotoUrl,
            true,
            4,
            "beneficiary_self",
            "Cadastro direto da família"), null, ct);

        var userId = Guid.NewGuid();
        var user = new User
        {
            Id = userId,
            Name = request.ResponsibleName,
            Email = $"beneficiario+{cpf[^4..]}@mealfy.local",
            Role = UserRole.Beneficiary,
            Status = AccountStatus.Active,
            DocumentType = "cpf",
            DocumentNumber = cpf,
            BeneficiaryId = Guid.Parse(family.Id),
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync(ct);

        var userDto = UserMapper.ToDto(user);
        await _firestore.SaveFamilyAsync(family.Id, family, ct);
        await _firestore.SaveUserAsync(userId.ToString(), userDto, ct);
        return new RegisterBeneficiaryResponse(userId.ToString(), userDto, family);
    }

    public async Task<LoginResponse> LoginMockAsync(string email, string password, CancellationToken ct = default)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();
        const string demoPassword = "mealfy123";

        if (normalizedEmail.EndsWith("@mealfy.com", StringComparison.Ordinal))
        {
            if (string.IsNullOrWhiteSpace(password) || password != demoPassword)
                throw new InvalidOperationException("Invalid credentials");
        }
        else
        {
            throw new InvalidOperationException("Use o login com e-mail e senha (Firebase) para esta conta.");
        }

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail, ct)
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
