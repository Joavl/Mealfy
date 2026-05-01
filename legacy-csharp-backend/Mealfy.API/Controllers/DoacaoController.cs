// Mealfy.API/Controllers/DoacaoController.cs
using Microsoft.AspNetCore.Mvc;

namespace Mealfy.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DoacaoController : ControllerBase
{
    [HttpPost("lote")]
    public IActionResult CriarLote([FromBody] object dto)
    {
        var id = Guid.NewGuid();
        var mock = new
        {
            id,
            doadorId = Guid.NewGuid(),
            fornecedorId = Guid.NewGuid(),
            valorUnitario = 50.00,
            quantidadeVouchers = 20,
            valorTotal = 1000.00,
            status = "AguardandoConfirmacao",
            criadoEm = DateTime.UtcNow
        };
        return CreatedAtAction(nameof(ObterPorId), new { id }, mock);
    }

    [HttpGet]
    public IActionResult Listar()
    {
        var mock = new[]
        {
            new { id = Guid.NewGuid(), valorTotal = 1000.00, status = "Distribuido",          quantidadeVouchers = 20 },
            new { id = Guid.NewGuid(), valorTotal = 500.00,  status = "Confirmado",            quantidadeVouchers = 10 },
            new { id = Guid.NewGuid(), valorTotal = 250.00,  status = "AguardandoConfirmacao", quantidadeVouchers = 5  }
        };
        return Ok(mock);
    }

    [HttpGet("{id:guid}")]
    public IActionResult ObterPorId(Guid id)
    {
        var mock = new
        {
            id,
            valorUnitario = 50.00,
            quantidadeVouchers = 20,
            valorTotal = 1000.00,
            status = "Confirmado",
            dataConfirmacao = DateTime.UtcNow.AddDays(-1),
            fornecedor = new { id = Guid.NewGuid(), nome = "Supermercado BomPreço" },
            doador = new { id = Guid.NewGuid(), nome = "Empresa XYZ Ltda" }
        };
        return Ok(mock);
    }

    [HttpPost("confirmar/{id:guid}")]
    public IActionResult Confirmar(Guid id)
    {
        return Ok(new
        {
            mensagem = $"Lote {id} confirmado pelo fornecedor.",
            status = "Confirmado",
            dataConfirmacao = DateTime.UtcNow
        });
    }

    [HttpPost("cancelar/{id:guid}")]
    public IActionResult Cancelar(Guid id)
    {
        return Ok(new { mensagem = $"Lote {id} cancelado." });
    }
}
