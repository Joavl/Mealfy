using Mealfy.Application.Contracts.Donations;

namespace Mealfy.Application.Abstractions;

public interface IDonationService
{
    Task<DonationWithGiftDto> CreateAsync(Guid donorId, CreateDonationRequest request, CancellationToken ct = default);
    Task<IReadOnlyList<DonationWithGiftDto>> CreateBatchAsync(Guid donorId, BatchDonationRequest request, CancellationToken ct = default);
    Task<BigDonationResultDto> CreateRegionalAsync(Guid donorId, RegionalDonationRequest request, CancellationToken ct = default);
    Task<IReadOnlyList<DonationWithGiftDto>> ListByDonorAsync(Guid donorId, CancellationToken ct = default);
}
