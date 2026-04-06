# CLAUDE.md — Pokémon Web App

## Descripción del Proyecto
Aplicación web de Pokémon construida con Next.js que permite gestionar equipos competitivos, importar/exportar en formato Pokémon Showdown, y calcular efectividad de tipos. El proyecto está dockerizado en múltiples contenedores para mantener cada servicio independiente.
Estos equipos tienen que tener 6 pokemon y cada pokemon tiene que tener 4 movimientos, un objeto, una habilidad, una naturaleza, evs e ivs.
---

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Frontend / Backend | Next.js 14+ (App Router) con TypeScript |
| Estilos | TailwindCSS |
| Base de Datos | PostgreSQL |
| ORM | Prisma |
| Sprites y datos Pokémon | PokéAPI (https://pokeapi.co) |
| Contenedores | Docker + docker-compose |
| Bot (futuro) | Servicio independiente en contenedor propio |

---

## Estructura de Carpetas

```
pokemon-app/
├── app/                        # Rutas Next.js (App Router)
│   ├── equipos/                # Página de gestión de equipos
│   ├── calculadora/            # Página de calculadoras de tipos
│   └── api/                    # API Routes (backend)
│       ├── folders/            # CRUD de carpetas
│       ├── teams/              # CRUD de equipos
│       └── pokemon/            # Proxy a PokéAPI
├── components/                 # Componentes UI reutilizables
├── lib/                        # Lógica de negocio y helpers
│   ├── db.ts                   # Cliente Prisma
│   └── pokeapi.ts              # Helper para PokéAPI
├── prisma/                     # Schema y migraciones de PostgreSQL
│   └── schema.prisma
├── types/                      # Tipos TypeScript globales
├── docker/                     # Dockerfiles por servicio
│   └── Dockerfile.nextjs
├── bot/                        # Servicio del bot (futuro)
├── docker-compose.yml          # Orquestación de contenedores
├── docker-compose.prod.yml     # Configuración para producción
└── .env                        # Variables de entorno (no commitear)
```

---

## Base de Datos — Modelo de Datos

```
Folder (Carpeta)
  └── id, name, createdAt
       └── Team (Equipo)
             └── id, name, folderId, createdAt
                  └── TeamPokemon (Pokémon del equipo)
                        └── id, teamId, pokemonName, slot (1-6),
                            nickname, item, ability,
                            move1, move2, move3, move4,
                            nature, evs, ivs
```

---

## Funcionalidades Principales

### 📁 Gestión de Equipos
- Organizar equipos dentro de carpetas
- Crear, editar y eliminar carpetas y equipos
- Cada equipo soporta hasta 6 Pokémon con sets completos (moves, EVs, IVs, nature, item, ability)
- **Import** de equipos en formato Pokémon Showdown (texto → DB)
- **Export** de equipos en formato Pokémon Showdown (DB → texto)

### ⚔️ Calculadoras de Tipos
- **Calculadora de Ataque:** dado un tipo atacante, muestra efectividad contra cada tipo defensivo
- **Calculadora de Defensa:** dado un Pokémon o combinación de tipos, muestra debilidades y resistencias
- **Calculadora de Equipo:** analiza la cobertura ofensiva y defensiva del equipo completo, identifica debilidades compartidas

### 🖼️ Sprites
- Todos los sprites se obtienen en tiempo real desde PokéAPI
- Endpoint proxy interno en `/api/pokemon/[name]` para centralizar las llamadas

### 🤖 Bot (Fase futura)
- Servicio completamente independiente en su propio contenedor Docker
- Se comunicará con la app principal via API interna
- Plataforma por definir (Discord / Telegram)
- Comandos planeados: consultar equipo, calcular tipos, buscar Pokémon

---

## Docker — Contenedores

```yaml
# Servicios planeados en docker-compose.yml
services:
  nextjs:      # Aplicación Next.js principal
  postgres:    # Base de datos PostgreSQL
  bot:         # Bot (se agrega en Fase 6)
```

---

## Variables de Entorno (.env)

```env
DATABASE_URL=postgresql://user:password@postgres:5432/pokemon_db
NEXT_PUBLIC_POKEAPI_URL=https://pokeapi.co/api/v2
```

---

## Showdown Export / Import Format:
Weavile @ Heavy-Duty Boots  
Ability: Pressure  
Tera Type: Ice  
EVs: 252 Atk / 4 SpD / 252 Spe  
Jolly Nature  
- Triple Axel  
- Knock Off  
- Ice Shard  
- Swords Dance  

Goodra-Hisui @ Assault Vest  
Ability: Gooey  
Tera Type: Fairy  
EVs: 248 HP / 252 SpA / 8 SpD  
Modest Nature  
- Draco Meteor  
- Heavy Slam  
- Flamethrower  
- Dragon Tail  

Raging Bolt @ Booster Energy  
Ability: Protosynthesis  
Tera Type: Fairy  
EVs: 4 Def / 252 SpA / 252 Spe  
Modest Nature  
IVs: 20 Atk  
- Calm Mind  
- Thunderclap  
- Dragon Pulse  
- Thunderbolt  

Conkeldurr @ Flame Orb  
Ability: Guts  
Tera Type: Normal  
EVs: 252 Atk / 4 Def / 252 Spe  
Adamant Nature  
- Drain Punch  
- Facade  
- Knock Off  
- Mach Punch  

Swampert @ Leftovers  
Ability: Torrent  
Tera Type: Fairy  
EVs: 252 HP / 4 Atk / 252 SpD  
Careful Nature  
- Stealth Rock  
- Earthquake  
- Flip Turn  
- Knock Off  

Armarouge @ Heavy-Duty Boots  
Ability: Weak Armor  
Tera Type: Fairy  
EVs: 4 Def / 252 SpA / 252 Spe  
Timid Nature  
IVs: 0 Atk  
- Armor Cannon  
- Psyshock  
- Energy Ball  
- Calm Mind  

--- 

## Roadmap de Desarrollo

### Fase 1 — Infraestructura Base
- Inicializar Next.js 14 con TypeScript y Tailwind
- Crear docker-compose.yml (Next.js + PostgreSQL)
- Verificar que los contenedores levanten correctamente
- Configurar variables de entorno

### Fase 2 — Base de Datos
- Instalar y configurar Prisma
- Diseñar schema: Folder → Team → TeamPokemon
- Crear migraciones iniciales
- Verificar conexión Next.js ↔ PostgreSQL en Docker

### Fase 3 — API Routes
- CRUD de carpetas y equipos
- Parser de formato Pokémon Showdown (Import/Export)
- Proxy a PokéAPI

### Fase 4 — Frontend / UI
- Layout base con navegación
- Página de Equipos (carpetas, equipos, armar equipo)
- Import / Export Showdown
- Página de Calculadoras

### Fase 5 — Calculadoras de Tipos
- Tabla de efectividad 18x18
- Calculadora de Ataque
- Calculadora de Defensa
- Calculadora de Equipo

### Fase 6 — Bot
- Definir plataforma
- Servicio independiente en Docker
- Conexión con API interna
- Comandos básicos

### Fase 7 — Pulido y Deploy
- Manejo de errores y estados de carga
- Validaciones en API Routes
- README con instrucciones Docker
- Configuración de producción

---

## Convenciones del Proyecto
- Lenguaje: **TypeScript** en todo el proyecto
- Estilo de código: ESLint + Prettier
- Commits: mensajes en inglés, formato convencional (`feat:`, `fix:`, `chore:`)
- Branches: `main` para producción, `dev` para desarrollo, features en `feat/nombre`
- Variables de entorno: nunca commitear `.env`, usar `.env.example` como referencia
