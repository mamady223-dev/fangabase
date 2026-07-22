# Checklist release candidate

| Gate                                     | Résultat actuel                | Preuve                                          |
| ---------------------------------------- | ------------------------------ | ----------------------------------------------- |
| Clone propre et installation JS figée    | PASS                           | rapport clone propre                            |
| Format, lint, typecheck, tests et builds | PASS                           | `pnpm release:check`                            |
| Laravel SQLite, PostgreSQL et MySQL      | PASS                           | local et `ci-databases`                         |
| E2E headless                             | PASS                           | Playwright local/CI                             |
| Contrats et parité                       | PASS                           | `test:contracts`, `test:parity`                 |
| Skills                                   | PASS                           | `quick_validate.py` pour les sept skills        |
| Secrets, CodeQL et Gitleaks              | PASS                           | scans local/archive et CI                       |
| Vulnérabilités hautes/critiques          | PASS                           | audits pnpm et Composer aux seuils documentés   |
| Packaging, SHA-256, manifeste, SBOM      | PASS                           | scripts release et `ci-release`                 |
| Docker compatible                        | PASS CI                        | `ci-docker`                                     |
| Fournisseurs réels                       | UAT EXTERNE                    | matrice fournisseurs                            |
| Composer local depuis réseau neuf        | UAT EXTERNE                    | incident Packagist; Laravel propre validé en CI |
| Licence définitive                       | **FAIL obligatoire**           | identité légale du titulaire absente            |
| Git propre et synchronisé                | À vérifier après rapport final | `git status -sb`                                |

La décision globale est `FAIL` si une gate obligatoire échoue, `UAT EXTERNE` pour une dépendance réellement extérieure non masquée, et `PASS` seulement lorsque toutes les gates obligatoires sont closes. Aucun tag n'est créé avec une licence en brouillon.
