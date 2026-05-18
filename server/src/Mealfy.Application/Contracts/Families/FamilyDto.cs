namespace Mealfy.Application.Contracts.Families;

public record FamilyDto(
    string Id,
    string RepresentativeName,
    string Region,
    int ChildrenCount,
    string Status,
    string SupportStatus,
    string SourceType,
    string SourceLabel,
    double Latitude,
    double Longitude,
    string? City,
    string? State);
