namespace Mealfy.Application.Contracts.Families;

public record CreateFamilyRequest(
    string RepresentativeName,
    string Region,
    int ChildrenCount,
    double Latitude,
    double Longitude,
    string? Neighborhood = null,
    string? City = null,
    string? State = null,
    string? ShortAddress = null,
    string? Description = null,
    string? MainNeed = null,
    string? FamilyName = null,
    string? ResponsibleCpf = null,
    string? ChildrenNamesJson = null,
    string? PhotoUrl = null,
    bool NeedsEntitySupport = false,
    int PriorityLevel = 3,
    string SourceType = "entity",
    string? SourceLabel = null);
