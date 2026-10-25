# Serviços da API

Organização plug-and-play:
- `data/`: acesso a dados e consultas específicas por domínio.
- `services/`: regras de negócio, validação e operações coordenadas.
- `routes/`: HTTP, autenticação e autorização.

Não colocar consultas SQL nas telas nem espalhar SQL por módulos sem necessidade. O binding atual é `RFIT_DB` (Cloudflare D1); uma troca de provedor deve ser resolvida nesta camada.
