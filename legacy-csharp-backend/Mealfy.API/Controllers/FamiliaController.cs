// Mealfy.API/Controllers/FamiliaController.cs
using Microsoft.AspNetCore.Mvc;

namespace Mealfy.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FamiliaController : ControllerBase
{
    [HttpPost]
    public IActionResult Criar([FromBody] object dto)
    {
        var mock = new
        {
            id = Guid.NewGuid(),
            nomeResponsavel = "Maria da Silva",
            documento = "123.456.789-00",
            rendaMensal = 800.00,
            status = "Pendente",
            criadoEm = DateTime.UtcNow
        };
        return CreatedAtAction(nameof(ObterPorId), new { id = mock.id }, mock);
    }

    [HttpGet]
    public IActionResult Listar()
    {
        var mock = new[]
        {
            new { id = Guid.NewGuid(), nomeResponsavel = "Maria da Silva", status = "Aprovada", rendaMensal = 800.00 },
            new { id = Guid.NewGuid(), nomeResponsavel = "João Pereira",   status = "Pendente", rendaMensal = 1200.00 },
            new { id = Guid.NewGuid(), nomeResponsavel = "Ana Souza",      status = "Rejeitada", rendaMensal = 950.00 }
        };
        return Ok(mock);
    }

    [HttpGet("{id:guid}")]
    public IActionResult ObterPorId(Guid id)
    {
        var mock = new
        {
            id,
            nomeResponsavel = "Maria da Silva",
            documento = "123.456.789-00",
            email = "maria@email.com",
            telefone = "(21) 99999-0000",
            rendaMensal = 800.00,
            status = "Aprovada",
            origem = "ONG",
            endereco = new
            {
                logradouro = "Rua das Flores",
                numero = "10",
                bairro = "Centro",
                cidade = "Rio de Janeiro",
                uf = "RJ",
                cep = "20000-000"
            },
            criancas = new[]
            {
                new { id = Guid.NewGuid(), nome = "Lucas Silva", idade = 7 }
            },
            criadoEm = DateTime.UtcNow
        };
        return Ok(mock);
    }

    [HttpPut("aprovar/{id:guid}")]
    public IActionResult Aprovar(Guid id)
    {
        return Ok(new { mensagem = $"Família {id} aprovada com sucesso." });
    }

    [HttpPut("rejeitar/{id:guid}")]
    public IActionResult Rejeitar(Guid id, [FromBody] object dto)
    {
        return Ok(new { mensagem = $"Família {id} rejeitada.", motivo = "Documentação incompleta." });
    }

    [HttpPut("{id:guid}/renda")]
    public IActionResult AtualizarRenda(Guid id, [FromBody] object dto)
    {
        return Ok(new { mensagem = $"Renda da família {id} atualizada." });
    }
}
