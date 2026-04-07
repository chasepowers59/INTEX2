using Intex.Api.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Intex.Api.Controllers;

[ApiController]
[Route("api/public/contact")]
public sealed class ContactController(ILogger<ContactController> logger) : ControllerBase
{
    [HttpPost]
    [AllowAnonymous]
    public ActionResult<ContactResponse> Submit([FromBody] ContactRequest request)
    {
        var name = request.Name?.Trim() ?? "";
        var email = request.Email?.Trim() ?? "";
        var inquiryType = request.InquiryType?.Trim() ?? "";
        var message = request.Message?.Trim() ?? "";

        if (string.IsNullOrWhiteSpace(name) ||
            string.IsNullOrWhiteSpace(email) ||
            string.IsNullOrWhiteSpace(inquiryType) ||
            string.IsNullOrWhiteSpace(message))
        {
            return BadRequest(new { message = "Name, email, inquiry type, and message are required." });
        }

        if (!email.Contains('@') || email.Length > 254)
        {
            return BadRequest(new { message = "Enter a valid email address." });
        }

        if (message.Length > 4000)
        {
            return BadRequest(new { message = "Please keep your message under 4,000 characters." });
        }

        var referenceId = $"CONTACT-{DateTimeOffset.UtcNow:yyyyMMddHHmmss}-{Guid.NewGuid():N}"[..34];

        logger.LogInformation(
            "Public contact submission {ReferenceId}: {InquiryType} from {Name} <{Email}>. Message length: {MessageLength}",
            referenceId,
            inquiryType,
            name,
            email,
            message.Length);

        return Ok(new ContactResponse(
            Message: "Thanks for reaching out. Your message was received by the API and routed for follow-up.",
            ReferenceId: referenceId
        ));
    }
}
