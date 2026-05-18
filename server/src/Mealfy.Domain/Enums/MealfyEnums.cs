namespace Mealfy.Domain.Enums;

public enum UserRole
{
    Donor = 0,
    Entity = 1,
    Beneficiary = 2,
    Admin = 3
}

public enum AccountStatus
{
    Pending = 0,
    Approved = 1,
    Rejected = 2,
    Active = 3
}

public enum FamilyStatus
{
    Pending = 0,
    Approved = 1,
    Rejected = 2,
    Suspended = 3
}

public enum SupportStatus
{
    NeedsHelp = 0,
    Supported = 1,
    Fed = 2,
    Pending = 3,
    Rejected = 4,
    Suspended = 5
}

public enum EntityType
{
    ONG = 0,
    Igreja = 1,
    Escola = 2,
    Instituto = 3
}

public enum ValidationSource
{
    CadUnico = 0,
    BolsaFamilia = 1,
    Sisvan = 2,
    Ivcad = 3
}

public enum IndicationStatus
{
    Pending = 0,
    Approved = 1,
    Rejected = 2,
    Converted = 3
}
