# Merati Tegelwerken - Website

Statische website voor Merati Tegelwerken (Behrouz Merati, Dessel).
Gebouwd op `@kashani-studio/template-classic`.

## Lokaal draaien

```powershell
pnpm install
pnpm dev          # http://localhost:4321
```

## Build voor productie

```powershell
pnpm build        # output in dist/
pnpm preview      # lokaal de build serveren
```

## Wat aanpassen

Alle merk- en bedrijfsdata zit in **EEN** bestand:

```
src/content/settings.json
```

Foto's gaan in:

```
public/uploads/
```

Dienst- en project-pagina's:

```
src/content/services/*.md
src/content/projects/*.md
```

## Deploy

Via Cloudflare Pages, gekoppeld aan de Git-repo.
Build command: `pnpm build`
Output dir: `dist`

## Domain

`https://meratitegelwerken.be` - geconfigureerd via Cloudflare Pages -> Custom Domains.

## Contactformulier

Form-submissions lopen via [Web3Forms](https://web3forms.com).
Access key staat in `src/content/settings.json` -> `forms.web3formsKey`.

## Performance

De bestaande achtergrondshader gebruikt rechtstreeks WebGL, zonder Three.js.
Alleen deze subtiele achtergrond wordt op 30 fps getekend; scroll- en
tekstanimaties behouden hun oorspronkelijke timing. Achtergrond, scrollpijl
en woordenbalk pauzeren buiten beeld of wanneer de tab verborgen is.
GPU-lagen voor de dienstenfoto's worden alleen dichtbij de viewport gereserveerd.

`node scripts/optimize-images.mjs` genereert kleinere WebP-bestanden, uitsluitend
wanneer de afmetingen en gedecodeerde pixels identiek blijven. De originele
bestanden blijven behouden. Na vervanging van foto's dit commando opnieuw draaien
en de site opnieuw bouwen.

`node --test tests/hero-webgl.test.mjs` controleert de achtergrondlimiet,
zichtbaarheid, hervatten vanuit browsergeschiedenis en terugval zonder WebGL.
