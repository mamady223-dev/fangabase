# Checklist release candidate

| Gate                                     | État attendu                                  | Preuve                                   |
| ---------------------------------------- | --------------------------------------------- | ---------------------------------------- |
| Clone propre et installation figée       | PASS                                          | rapport clone propre                     |
| Format, lint, typecheck, tests et builds | PASS                                          | `pnpm release:check`                     |
| Laravel SQLite, PostgreSQL et MySQL      | PASS                                          | local et `ci-databases`                  |
| E2E headless                             | PASS                                          | Playwright local/CI                      |
| Contrats et parité                       | PASS                                          | `test:contracts`, `test:parity`          |
| Skills                                   | PASS                                          | `quick_validate.py` pour les sept skills |
| Secrets, CodeQL et Gitleaks              | PASS                                          | scans local/archive et CI                |
| Vulnérabilités hautes/critiques          | PASS                                          | audits pnpm et Composer                  |
| Packaging, SHA-256, manifeste, SBOM      | PASS                                          | scripts release et CI                    |
| Licence définitive                       | PASS obligatoire                              | nom légal et adoption humaine            |
| Fournisseurs réels                       | UAT EXTERNE visible                           | matrice fournisseurs                     |
| Docker                                   | PASS pour l'image compatible ou UAT explicite | `ci-docker`                              |
| Git propre et synchronisé                | PASS                                          | `git status -sb`                         |

La décision globale est `FAIL` si une gate obligatoire échoue, `UAT EXTERNE` pour une dépendance réellement extérieure non masquée, et `PASS` seulement lorsque toutes les gates obligatoires sont closes. Aucun tag n'est créé avec une licence en brouillon.
