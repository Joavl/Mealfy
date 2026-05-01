// Mealfy.API/Controllers/VoucherController.cs
using Microsoft.AspNetCore.Mvc;

namespace Mealfy.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class VoucherController : ControllerBase
{
    [HttpGet]
    public IActionResult Listar()
    {
        var mock = new[]
        {
            new { id = Guid.NewGuid(), codigo = "MEAL-001-XYZ", valor = 50.00, status = "Disponivel", dataValidade = DateTime.UtcNow.AddDays(30) },
            new { id = Guid.NewGuid(), codigo = "MEAL-002-ABC", valor = 50.00, status = "Alocado",    dataValidade = DateTime.UtcNow.AddDays(25) },
            new { id = Guid.NewGuid(), codigo = "MEAL-003-QWE", valor = 50.00, status = "Utilizado",  dataValidade = DateTime.UtcNow.AddDays(10) }
        };
        return Ok(mock);
    }

    [HttpGet("disponiveis")]
    public IActionResult ListarDisponiveis()
    {
        var mock = new[]
        {
            new { id = Guid.NewGuid(), codigo = "MEAL-001-XYZ", valor = 50.00, fornecedor = "Supermercado BomPreço", dataValidade = DateTime.UtcNow.AddDays(30) },
            new { id = Guid.NewGuid(), codigo = "MEAL-004-RTY", valor = 50.00, fornecedor = "Supermercado BomPreço", dataValidade = DateTime.UtcNow.AddDays(28) }
        };
        return Ok(mock);
    }

    [HttpGet("{id:guid}")]
    public IActionResult ObterPorId(Guid id)
    {
        var mock = new
        {
            id,
            codigo = "MEAL-001-XYZ",
            valor = 50.00,
            status = "Alocado",
            dataValidade = DateTime.UtcNow.AddDays(30),
            fornecedor = new { id = Guid.NewGuid(), nome = "Supermercado BomPreço" },
            alocacao = new
            {
                criancaId = Guid.NewGuid(),
                nomeCrianca = "Lucas Silva",
                dataAlocacao = DateTime.UtcNow.AddDays(-2),
                dataUtilizacao = (DateTime?)null
            }
        };
        return Ok(mock);
    }

    [HttpPost("alocar")]
    public IActionResult Alocar([FromBody] object dto)
    {
        return Ok(new
        {
            mensagem = "Voucher alocado com sucesso.",
            alocacaoId = Guid.NewGuid(),
            dataAlocacao = DateTime.UtcNow
        });
    }

    [HttpPost("utilizar/{id:guid}")]
    public IActionResult Utilizar(Guid id)
    {
        return Ok(new
        {
            mensagem = $"Voucher {id} marcado como utilizado.",
            dataUtilizacao = DateTime.UtcNow
        });
    }

    [HttpPost("expirar/{id:guid}")]
    public IActionResult Expirar(Guid id)
    {
        return Ok(new { mensagem = $"Voucher {id} expirado manualmente." });
    }
}
