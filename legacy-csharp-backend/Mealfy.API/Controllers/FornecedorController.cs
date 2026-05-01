// Mealfy.API/Controllers/FornecedorController.cs
using Microsoft.AspNetCore.Mvc;

namespace Mealfy.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FornecedorController : ControllerBase
{
    [HttpPost]
    public IActionResult Criar([FromBody] object dto)
    {
        var mock = new
        {
            id = Guid.NewGuid(),
            nome = "Supermercado BomPreço",
            cnpj = "98.765.432/0001-11",
            tipo = "Mercado",
            ativo = true,
            criadoEm = DateTime.UtcNow
        };
        return CreatedAtAction(nameof(ObterPorId), new { id = mock.id }, mock);
    }

    [HttpGet]
    public IActionResult Listar()
    {
        var mock = new[]
        {
            new { id = Guid.NewGuid(), nome = "Supermercado BomPreço", tipo = "Mercado",          ativo = true  },
            new { id = Guid.NewGuid(), nome = "iFood Empresas",         tipo = "Delivery",         ativo = true  },
            new { id = Guid.NewGuid(), nome = "Cartão Nutrição SA",      tipo = "CartaoAlimentacao", ativo = false }
        };
        return Ok(mock);
    }

    [HttpGet("{id:guid}")]
    public IActionResult ObterPorId(Guid id)
    {
        var mock = new
        {
            id,
            nome = "Supermercado BomPreço",
            cnpj = "98.765.432/0001-11",
            tipo = "Mercado",
            email = "parceiros@bompreco.com.br",
            integracaoApiUrl = "https://api.bompreco.com.br/vouchers",
            ativo = true
        };
        return Ok(mock);
    }

    [HttpPut("{id:guid}/api-url")]
    public IActionResult AtualizarApiUrl(Guid id, [FromBody] object dto)
    {
        return Ok(new { mensagem = $"URL de integração do fornecedor {id} atualizada." });
    }

    [HttpPut("desativar/{id:guid}")]
    public IActionResult Desativar(Guid id)
    {
        return Ok(new { mensagem = $"Fornecedor {id} desativado." });
    }
}
