# Comoros_Warnings

Produit d'alerte de potentiel d'inondation avec quantification de l'incertitude pour l'Union des Comores : zones de potentiel d'inondation issues du débit unitaire maximal d'ensemble d'EF5 (vue A aléa, vue B ajustée à l'impact), couches de pluie et de débit unitaire, zones de vérification QPE, pour les rétro-prévisions TITO du 26 au 28 avril 2024 (72 cycles) et du 4 au 7 mai 2025 (96 cycles).

Flood potential warning product with uncertainty quantification for the Union of the Comoros: flood potential zones from the ensemble maximum unit streamflow of EF5 (View A hazard, View B impact adjusted), rainfall and unit streamflow layers, QPE verification zones, for the TITO hindcasts of 26 to 28 April 2024 (72 cycles) and 4 to 7 May 2025 (96 cycles).

Site: https://ahwalab.github.io/Comoros_Warnings/ (accueil bilingue / bilingual landing page), https://ahwalab.github.io/Comoros_Warnings/fr/ (français), https://ahwalab.github.io/Comoros_Warnings/en/ (English).

## Contenu / Content

| Chemin / Path | Contenu / Content |
|---|---|
| `index.html` | Page d'accueil / landing page |
| `fr/index.html`, `en/index.html` | Visionneuse (Leaflet) / viewer |
| `assets/data/zones/<event>/<cycle>.js` | Zones de potentiel par cycle, vues A et B, jeux de bandes FLASH et îles escarpées, chargées à la demande / potential zones per cycle, loaded on demand |
| `assets/data/series_<event>.js` | Séries par cycle et par île (pluie analysée et prévue, surfaces par bande, comptes de zones, population) / per cycle and island series |
| `assets/data/verif_<event>.js` | Zones de vérification QPE (maximum de l'analyse STREAM-Sat sur l'événement) / QPE verification zones |
| `assets/layers/<island>/<cycle>_<layer>.png` | Rasters par île en EPSG 3857 : classe p90 (bandes FLASH et escarpées), probabilité de débit unitaire > 1, QPE cumulée, pluie prévue 24 h ; pour les cycles mis en avant p05, médiane, p95 et maximum des 50 membres, médiane et maximum des 10 membres d'analyse / per island rasters |
| `assets/layers/<island>/<event>_qpemax.png`, `_qpetot.png` | Maximum du débit unitaire d'analyse et total de pluie sur l'événement / event maximum analysis unit streamflow and event rainfall total |
| `assets/data/communes.js`, `reports.js`, `grid.js` | Communes, impacts rapportés, géométrie des grilles / communes, reported impacts, grid geometry |

Bandes : FLASH 0,5 / 1 / 2 / 4 m3/s/km2 (comparable au produit du Guatemala) et îles escarpées 2 / 4 / 6 / 10 m3/s/km2. Zones : cellules où au moins 3 des 50 membres dépassent la première bande, fermeture et ouverture morphologiques, connectivité 8, au moins 0,32 km2. Classe : bande la plus haute atteinte par le 90e centile des membres dans la zone. Vue B : niveau de vraisemblance (5, 20, 50 pour cent) croisé avec l'impact (densité bâtie, équipements à moins de 500 m).

Bands: FLASH 0.5 / 1 / 2 / 4 m3/s/km2 (comparable with the Guatemala product) and steep islands 2 / 4 / 6 / 10 m3/s/km2. Zones: cells where at least 3 of 50 members exceed the first band, morphological closing and opening, 8 connectivity, at least 0.32 km2. Class: highest band reached by the 90th percentile of the members inside the zone. View B: likelihood tier (5, 20, 50 percent) crossed with impact (built density, facilities within 500 m).

## Notes

- L'archive ne contient pas d'hydrogrammes (aucun exutoire avec `outputts=true`) ; le produit utilise les séries de pluie moyenne par île et les surfaces au dessus des bandes de débit unitaire. / The archive holds no hydrographs (no outlet with `outputts=true`); the product uses island mean rainfall series and the area above unit streamflow bands.
- L'ensemble d'avril 2024 est très humide sur la Grande Comore, d'où des zones à l'échelle de l'île avec les bandes FLASH ; le jeu de bandes escarpées et les rasters de probabilité et de centiles gardent la gradation. / The April 2024 ensemble is very wet on Grande Comore, hence island wide zones with the FLASH bands; the steep band set and the probability and percentile rasters keep the gradation.
- Le fond de carte nécessite une connexion; les couches du produit fonctionnent hors ligne. / The basemap needs a connection; the product layers work offline.
- Démonstration en rétro-prévision, pas une alerte officielle. / Hindcast demonstration, not an official warning.

Produits associés / related products: [Comoros_FIM](https://ahwalab.github.io/Comoros_FIM/), [Comoros_IFB](https://ahwalab.github.io/Comoros_IFB/).

AHWA Laboratory, The University of Iowa. Projet EWS-F financé par l'OMM / EWS-F project funded by the WMO.
