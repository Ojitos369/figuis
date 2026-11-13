---
name: "source-command-linkear"
description: "Migrated source command `linkear`"
---

# source-command-linkear

Use this skill when the user asks to run the migrated source command `linkear`.

## Command Template

# Comando: linkear

Crea/verifica symlinks entre el repo local y Obsidian para documentación sincronizada.

## Uso
```bash
# Verificar todos los symlinks
git ls-files -s | grep 120000

# Crear symlink individual
ln -s /home/ojitos369/Documents/Obsidian/OjosApps/Projects/figuis/<archivo> <archivo>

# Forzar reemplazo
rm <archivo> && ln -s /home/ojitos369/Documents/Obsidian/OjosApps/Projects/figuis/<archivo> <archivo>
```

## Symlinks del proyecto
- `AGENTS.md` → `../../../Obsidian/OjosApps/Projects/figuis/AGENTS.md`
- `AGENTS.md` → `../../../Obsidian/OjosApps/Projects/figuis/AGENTS.md`
- `prompts/` → `../../../Obsidian/OjosApps/Projects/figuis/prompts/`

Si un symlink está roto o no existe, recrea con los comandos arriba.

## Raíz de Obsidian
`/home/ojitos369/Documents/Obsidian/OjosApps`

## Nota
Los symlinks deben mantenerse en git. Si git los convierte en blobs, usa:
```bash
git rm --cached <archivo>
git add <archivo>
git commit -m "restore symlink: <archivo>"
```
