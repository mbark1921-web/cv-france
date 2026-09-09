# Jovelya 20.7.0 — qualification, mise à jour du 9 septembre 2026

Verdict : **GO FOR PRODUCTION** pour la version applicative qualifiée ci-dessous.
Les blocages demandés sont clôturés : gate complet, déploiement, pages légales,
parcours authentifié/PDF, rotation Brevo et sauvegarde/restauration réelle.

## Publication finale vérifiée — 9 septembre 2026

- Version applicative : `bddce496b006b2ada92eaffecc804cee348d8fe9`, poussée sur `main`
  après le gate local **185/185**, zéro échec, ignoré ou annulé.
- [GitHub Release Gate](https://github.com/mbark1921-web/cv-france/actions/runs/34343062627) :
  `completed / success` pour ce SHA exact.
- Render : déploiement `dep-dagjnle417fc73fju06g`, **Live** ; lien « Last successfully
  deployed commit » relu avec ce SHA complet, durée affichée 42,8 s.
- `/api/health`, `/api/startup`, `/api/readiness` : **HTTP 200**, `ok: true`.
  Nouvelle lecture de readiness : `checks.database: true` (sonde réelle PostgreSQL).
- [Mentions légales](https://cv-france-staging.onrender.com/mentions-legales.html) et
  [confidentialité](https://cv-france-staging.onrender.com/privacy.html) relues sur
  le service déployé : M’Bark Abehri, personne physique, Jovelya / CV France,
  contact public approuvé et cinq règles de conservation exactes présents.
- Diff final contrôlé ; aucun secret, paramètre d’infrastructure, contenu de
  production ou archive de sauvegarde modifié par cette publication.

La publication suivante de ce rapport est exclusivement documentaire : elle ne
change pas la version applicative qualifiée ci-dessus. Les entrées historiques
ci-dessous conservent leur contexte ; leurs anciens NO-GO ne sont plus le verdict
courant. Les contrôles précédemment clôturés n’ont pas été répétés.

Obligation d’exploitation conservée : appliquer les durées approuvées, notamment
la conservation des sauvegardes sur 30 jours. Aucune automatisation récurrente ou
suppression automatique Drive n’est annoncée comme mise en place.

## Fixture des comptes et gate final — correction qualifiée

Le premier gate de publication échoue sur les dix tests dépendant du hook des
comptes. Il n’a pas produit de bilan final complet : un échec de nettoyage Windows
`EPERM` a remplacé l’erreur du gate dans la sortie finale. Ce passage n’est pas
présenté comme réussi et les tests non terminés ne sont pas comptés comme passants.

Diagnostic : l’ancienne fixture lance un second processus Node et attend un message
IPC pour connaître le port HTTP, alors que le runner isole déjà chaque fichier de
test. Les instrumentations isolée puis accessibilité + comptes reproduisent un
serveur prêt en environ 1,1 s et dix tests verts ; le retard intermittent exact du
processus enfant n’a pas été reproduit pendant ces mesures. Aucun défaut PostgreSQL
ou fonctionnel du compte n’en est déduit.

La fixture démarre désormais le **vrai backend généré dans le processus isolé du
fichier de test** et attend son écoute HTTP effective. Le processus supplémentaire
et l’attente IPC fragile sont supprimés ; erreurs d’import/d’écoute remontent
directement. Le délai de démarrage reste **10 secondes**, les dix assertions de
parcours FR/AR et les scénarios d’erreur restent inchangés. Serveur, connexions,
variables d’environnement et gestionnaires de signaux sont nettoyés après la suite.
Le passage ciblé est **10/10**, zéro échec, ignoré ou annulé.

Le gate utilise TAP pour conserver immédiatement les causes d’échec des hooks,
réessaie brièvement le nettoyage des seuls répertoires temporaires verrouillés et
préserve toujours l’erreur initiale si le nettoyage échoue aussi. Aucun test ignoré,
aucun seuil métier ou délai de requête assoupli. Le gate complet corrigé termine
avec **185/185 tests réussis, 0 échec, 0 ignoré, 0 annulé**, en 404,393 s pour
les tests. Contrôles syntaxiques, constructions propres reproductibles et assertions
de release réussis ; commande `npm run test:ci`, code de sortie 0 et message
`RELEASE GATE PASSED`, le 9 septembre 2026. Publication autorisée après ce résultat.

## Sauvegarde durable et restauration réelle — blocage clôturé le 9 septembre

Export PostgreSQL **17.11** depuis la source **17.6**, en transactions de lecture
seule et instantané cohérent partagé avec `pg_dump`. TLS `verify-full` avec le
certificat public téléchargé depuis le lien du tableau Supabase ; aucun contrôle
TLS désactivé. Connexion saisie par l’opérateur, protégée avec Windows DPAPI et
utilisée uniquement en mémoire/environnement enfant, sans sortie de secret.

Archive logique du schéma applicatif `public`, soit les **13 tables** attendues :
**62 903 octets**, SHA-256
`58139cdb6a077e1d3bb8ad1bc3dc53748d5d6ce8887f7fdfacb10c4a83181ceb`.
Elle couvre les données applicatives, schéma, contraintes, index et séquences.
Elle ne constitue pas une sauvegarde de toute la plateforme Supabase : schémas
internes gérés, objets Storage, propriétaires et droits de rôles exclus.

[Archive privée Google Drive](https://drive.google.com/file/d/1nTXV08YpvCFcXnn-am7TYAGwcooZTffn/view)
dans le dossier dédié autorisé. Téléversement confirmé, taille relue identique,
fichier non partagé, permission propriétaire uniquement. La récupération brute
par le connecteur réussit et retourne une référence de fichier de 62 903 octets,
sans contenu inline. Le connecteur ne matérialise pas cette référence sur le poste :
la restauration utilise l’archive locale exacte ayant servi au téléversement,
avec son SHA-256 recontrôlé avant et après ; aucun hash d’un aller-retour local
Drive n’est prétendu. Le manifeste et le mode opératoire sont aussi déposés et
relus dans le dossier, non partagés.

Restauration dans une base temporaire PostgreSQL **17**, liée exclusivement à
`127.0.0.1` sur un port aléatoire, jamais dans la source. Résultat vérifié à
**2026-09-09 06:18:15 UTC** :

- Liste exacte des **13 tables** et empreintes de toutes les lignes identiques.
- Colonnes/types/nullabilité/défauts, contraintes validées et index identiques.
- États RLS identiques ; **11 séquences identity** vérifiées contre les IDs existants,
  sans incrémentation par `nextval`.
- Archive SHA-256 inchangée ; base temporaire arrêtée et supprimée après contrôle.
- Aucune écriture ni suppression de données de production.

Le premier contrôle de contenu a échoué sur la représentation des horodatages ;
la comparaison avec la session restaurée normalisée en UTC est ensuite identique.
Le contrôle final inclut les séquences identity (pas seulement les défauts SERIAL).
Les lignes et leur contenu n’ont pas été affichés dans les sorties de contrôle.

Conservation opérateur : **30 jours**, révision/suppression des copies au
**9 octobre 2026**. Il s’agit d’une sauvegarde ponctuelle ; aucune planification
récurrente ni suppression automatique Drive n’a été créée. Ces opérations de
maintenance restent à organiser par l’opérateur selon la politique validée.
Le certificat d’autorité est public ; aucun réglage d’infrastructure ni secret
Render/Supabase n’a été modifié. Les blocages historiques ci-dessous sont remplacés
par cette preuve d’export durable et de restauration réelle.

## Sauvegarde réelle — destination vérifiée, export bloqué

Google Drive connecté accessible. Dossier dédié créé et relu :
[Jovelya — sauvegardes PostgreSQL](https://drive.google.com/drive/folders/1Zfca5VlG_6rSe0uyCoVWZh-0psr9Y0Pd).
Aucune archive n’y a encore été déposée ; sa création ne prouve pas une sauvegarde.

Une requête SQL de métadonnées en lecture seule sur le projet autorisé confirme
PostgreSQL **17.6**, base `postgres`, **13 tables publiques**. Aucun contenu de
ligne ni secret n’a été retourné par cette vérification.

Blocage : aucun identifiant PostgreSQL natif disponible dans l’environnement local,
ni fichier `.env` du projet ou fichier libpq `pgpass.conf` disponible. Le connecteur
SQL authentifié ne fournit pas de mot de passe utilisable par `pg_dump`. L’export
nécessite une saisie locale sécurisée par l’opérateur, jamais dans le chat. Les
outils portables locaux identifiés sont PostgreSQL 16 ; il faudra un `pg_dump`
compatible avec le serveur 17 avant l’export réel. Aucun réglage ni donnée de
production modifié, aucune rotation de secret effectuée. Aucun export de lignes
via sortie SQL n’a été tenté. Restauration réelle non effectuée.

La publication des modifications légales reste suspendue à la réussite de la
sauvegarde/restauration, conformément à l’ordre explicite de l’opérateur.

## Informations légales validées par l’opérateur — 9 septembre

Les mentions légales et la politique de confidentialité locales indiquent désormais
M’Bark Abehri, personne physique, exploitant/éditeur de Jovelya / CV France,
contact public et exercice des droits : `mbark1921@gmail.com`.
L’ancien texte conditionnel relatif à l’anonymat de l’éditeur est remplacé par
l’identité fournie. Aucune adresse, immatriculation ou autre donnée n’est inventée.

Durées expressément validées par l’opérateur et intégrées à la politique :

- Journaux techniques : 30 jours.
- Comptes inactifs : 24 mois.
- Demandes de support et feedback : 24 mois.
- Données d’un compte supprimé : suppression immédiate, sauf obligation légale contraire.
- Sauvegardes techniques : 30 jours, lorsqu’elles sont disponibles.

Il s’agit de la politique déclarée et validée par l’opérateur ; cette mise à jour
éditoriale ne constitue pas une nouvelle preuve d’exécution des purges, ne modifie
aucun mécanisme de suppression et ne certifie pas l’existence de sauvegardes.
Contrôles éditoriaux : identité, contact, nom du service et cinq règles de
conservation vérifiés après deux passages du remplacement de marque. Le libellé
historique « CV France » du nom fourni est conservé dans le HTML rendu. Le contrôle
de build reproductible et de syntaxe est vert ; `git diff --check` est vert.
Aucune infrastructure ni aucun secret modifié. Les anciens passages ci-dessous
signalant l’absence d’informations opérateur sont historiques et remplacés par
cette confirmation. Les pages locales sont mises à jour ; leur publication n’est
pas affirmée sans nouveau déploiement vérifié.

## Confirmation opérateur — téléchargement PDF clôturé

Le 9 septembre, l’opérateur confirme : « PDF téléchargé et enregistré avec succès ».
Cette confirmation lève l’incertitude sur la récupération du fichier dans le
navigateur intégré. Elle complète la génération dans la session authentifiée et
l’ouverture/inspection indépendante du PDF déployé déjà vérifiées ci-dessous.
L’ouverture de cette copie précise par l’opérateur n’est pas affirmée : sa
confirmation porte sur le téléchargement et l’enregistrement. Aucun nouveau test,
changement de code ou redéploiement n’est nécessaire pour consigner ce résultat.

## Déploiement du correctif PDF — preuves finales

Correctif commité et poussé après gate vert :
`7b8700ecf1372b56f452065f303212a8c5937794`.
[GitHub Release Gate 34289919264](https://github.com/mbark1921-web/cv-france/actions/runs/34289919264)
: **completed / success**, même SHA. Render, après actualisation du tableau,
indique ce commit comme **Last successfully deployed commit** et **Live** :
`dep-dag9epuq1p3s73d885c0`, démarré le 9 septembre à 01:16:55 GMT+2.
Les sondes `/api/health`, `/api/startup`, `/api/readiness` sont **HTTP 200**,
`ok:true`, et la sonde réelle PostgreSQL `database:true`. Aucun réglage modifié.

Le test navigateur contre le site déployé, sans mocks, déclenche le bouton et
récupère **Qualification PDF - document fictif.pdf** : 37 299 octets, une page A4,
texte sélectionnable et sections attendues, zéro écriture API. Fichier ouvert avec
PDF.js, rendu avec Poppler et inspecté visuellement : pas de contenu manquant ni
de chevauchement sur ce document. Copie locale : `tmp/pdfs/deployed-fr.pdf`.
SHA-256 : `b7e5e0c693f0260ab54e9ce7f97ddc145bec91e4f31a10f66cb4de0206c2eaee`.

Dans l’onglet de la session autorisée, après chargement du nouveau déploiement,
**Mon compte**, e-mail confirmé et trois CV existants sont de nouveau constatés.
Un document fictif est saisi sans sauvegarde serveur. Le bouton produit
**PDF prêt.** et le lien **Télécharger le PDF**. Le téléchargement est vérifié
sur le navigateur de test ci-dessus ; sa récupération locale dans le navigateur
intégré n’est pas certifiée : aucun événement de téléchargement n’y a été reçu,
et l’ouverture du lien `blob:` par l’outil est rejetée par sa politique de sécurité.
Aucun contournement de cette politique ni Ctrl+P n’a été utilisé.
Cette limite de l’outil est désormais complétée par la confirmation opérateur
de téléchargement et d’enregistrement ci-dessus ; elle n’est plus un blocage.

Verdict global : **NO-GO** jusqu’à sauvegarde réelle durable + restauration isolée,
et finalisation des informations légales/contact/conservation. Brevo reste clôturé.
Cette section consigne les preuves recueillies après la poussée du correctif ;
elle est conservée dans le rapport local en attendant les éléments opérateur.

## Correctif PDF — vérification locale du 9 septembre

L’opérateur a confirmé un **échec réel** du bouton « Enregistrer en PDF » : aucun
dialogue ni téléchargement. Les derniers gestionnaires appelaient `window.print()`,
ce qui dépendait du dialogue d’impression de l’environnement et ne produisait aucun
fichier téléchargeable dans le navigateur intégré utilisé. Ce constat remplace
l’ancienne hypothèse d’un simple contrôle manuel restant à faire.

Le correctif remplace ce gestionnaire par une génération locale jsPDF et un lien
Blob de téléchargement explicite. Bibliothèque et polices FR/AR sont servies par
l’application, sans CDN ni transmission des contenus à un convertisseur externe.
Le bouton expose l’état de génération, empêche les clics concurrents et affiche
une erreur récupérable si les ressources ne chargent pas. Aucun recours à Ctrl+P.

Quatre nouveaux tests passent : huit modèles en FR, huit en AR, contenu long
paginé, échec de police puis nouvelle tentative. Les tests déclenchent le bouton,
enregistrent le vrai téléchargement, ouvrent le PDF avec un lecteur indépendant
et vérifient format A4 et texte sélectionnable. `window.print` est interdit dans
la fixture. L’ordre arabe est vérifié sur le nom et une phrase entière après
normalisation Unicode ; le double renversement initial a été corrigé.

Les 17 PDF générés ont été rendus avec Poppler : inspection des huit modèles dans
les deux langues, du modèle classique agrandi, des colonnes FR/AR et de la dernière
page du CV long (4 pages, marqueur final intact). Les mises en page PDF sont
recomposées pour A4 à partir des champs, avec colonnes et accents selon le modèle ;
elles ne constituent pas une capture pixel pour pixel de l’aperçu HTML.
`npm audit` indique zéro vulnérabilité connue au moment du contrôle.
Le gate complet `npm run test:ci` est **RELEASE GATE PASSED** : **185/185**,
zéro échec, zéro ignoré, durée des suites **425,0 s**. Il comprend les 181 tests
existants et quatre nouveaux tests PDF. Deux builds indépendants identiques,
syntaxe générée et exercice PostgreSQL jetable validés. La revue du diff ne révèle
aucune modification des autres fonctions applicatives, des secrets ou des données.
La vérification déployée du correctif est consignée dans la section précédente.

## Blocages de qualification encore ouverts

- Sauvegarde : aucune archive réelle du projet dans une destination durable fournie,
  donc aucune restauration isolée de cette archive certifiée. Les tests existants
  utilisent des données synthétiques et ne prouvent pas une sauvegarde de production.
  Le plan Supabase Free n’inclut pas les sauvegardes gérées/PITR ; un export logique
  sécurisé avec stockage externe et restauration locale reste techniquement possible.
  Les commandes `npm run backup/restore` du dépôt refusent volontairement les sources
  de production : ce sont les outils d’exercice local, pas un export Supabase.
- Informations opérateur : identité et contact légal explicites, ou éléments
  justifiant le régime d’éditeur non professionnel, non fournis ; contact public
  d’exercice des droits et durées/critères effectifs de conservation à finaliser.
  Aucune identité, adresse ou politique de purge n’a été inventée.

La destination de sauvegarde et les informations légales ont été demandées à
l’opérateur. Aucun secret n’a été demandé dans le chat. Aucun dump de données
personnelles n’est stocké dans le dépôt. Brevo reste clôturé ; les contrôles
historiques ci-dessous sont conservés comme historique, leurs anciens blocages
sont remplacés par les constats les plus récents.

## Parcours connecté — contrôles en lecture seule

Après connexion opérateur, le compte autorisé affiche **Connecté** et **Mon compte**.
Les trois CV existants et une candidature existante se chargent ; les sections
Lettres et Candidatures s'ouvrent, et le champ date conserve son nom accessible.
Aucun document existant n'a été modifié ni supprimé. Un CV de démonstration a été
saisi uniquement dans le formulaire ; l'aperçu affiche le nom, le poste et les
sections attendues. Aucune sauvegarde serveur de ce document n'a été demandée.
Ce contrôle valide la session, la lecture et la navigation ; il ne certifie pas
un cycle d'écriture complet sur le compte de production.

Le bouton PDF a été actionné dans cette session authentifiée. L'état accessible
et la capture du navigateur intégré restent sur le formulaire/aperçu : aucun
dialogue d'impression ni fichier enregistré n'a pu être constaté. Le document
fictif reste prêt dans l'onglet conservé pour un enregistrement manuel ; le fichier
devra ensuite être ouvert et inspecté avant de lever le blocage PDF.

## Rotation Brevo clôturée après contrôle des statuts

Après confirmation opérateur, la liste Brevo a été relue uniquement pour les
noms et statuts : `CV France Production` est **Désactivée** et
`Jovelya Render rotation 2026-09-08` reste **Active**. La désactivation révoque
l'utilisation de l'ancienne clé ; elle n'a pas été supprimée de la liste.
Avec le redéploiement et la livraison réelle déjà vérifiés ci-dessous, le
blocage de rotation Brevo est levé. Aucun nouvel envoi ni contrôle de déploiement
n'a été répété. Les passages historiques décrivant la révocation en attente
sont remplacés par ce constat.

Restent ouverts : parcours authentifié sur une session fournie par l'opérateur,
fichier PDF réellement enregistré et inspecté, sauvegarde durable du projet et
restauration isolée de cette sauvegarde, identité/contact légal et informations
de conservation à finaliser. Ces points empêchent encore un GO global.

À la reprise suivante, l'application a affiché `Non connecté` dans Compte.
L'onglet de connexion au compte autorisé a été préparé et conservé pour la saisie
opérateur. Aucun mot de passe demandé dans la conversation, aucune donnée du
compte modifiée. Emplacement de sauvegarde/destination durable et informations
d'identité, contact et conservation demandés ; aucune réponse encore disponible.

## Livraison réelle confirmée et ancienne clé identifiée

Un seul courriel de réinitialisation a été demandé via le formulaire déployé,
uniquement vers l'adresse du compte explicitement autorisée par l'opérateur.
Brevo confirme les événements **Envoyé** puis **Délivré** le 8 septembre à 14:31.
Le lien et le contenu secret du courriel n'ont pas été ouverts ; aucun mot de
passe n'a été modifié. La livraison au fournisseur destinataire est vérifiée,
sans prétendre avoir confirmé son classement dans la boîte principale.

La clé `Jovelya Render rotation 2026-09-08`, créée le 8 septembre à 14:19,
est active et sa dernière utilisation est le 8 septembre. L'ancienne clé
`CV France Production`, créée le 1 septembre à 00:30, est encore active,
dernière utilisation affichée le 3 septembre. Seule cette ancienne ligne a été
sélectionnée ; sa fenêtre de désactivation est ouverte. Le bouton final
`Désactiver` attend l'intervention opérateur imposée pour cette modification
d'identifiant. La révocation n'est donc pas encore déclarée accomplie.

## Rotation Brevo — remplacement déclaré et redéploiement vérifié

L'opérateur confirme avoir généré la clé de remplacement puis enregistré le secret
sur Render. Aucune valeur secrète n'a été lue ou affichée dans cette étape.
Le déploiement manuel `dep-dafvt5tg1s2s738e0om0` du 8 septembre à 14:24:55 GMT+2
est **Live**, durée 44,3 s, sur `d0ab05b788b8cb4dbfaf6f34050416d9c31ce07d`.
Les GET health/startup/readiness répondent **200**, avec `ok:true`, `email:true`
et `database:true`. Ces contrôles ne prouvent pas l'authentification auprès de
Brevo ni la livraison d'un courriel. Adresse de réception contrôlée et autorisée
demandée à l'opérateur ; aucun envoi effectué à ce stade. L'ancienne clé n'a pas
été révoquée : conformément à l'ordre demandé, sa révocation attend la livraison
réussie via le déploiement utilisant la nouvelle clé. Rotation donc non clôturée.

## Vérification après poussée de d0ab05b

Commit poussé : `d0ab05b788b8cb4dbfaf6f34050416d9c31ce07d`.
Le [GitHub Release Gate 34191669355](https://github.com/mbark1921-web/cv-france/actions/runs/34191669355)
est **completed / success** sur ce SHA. Render indique **Deploy succeeded | Live**
pour `dep-dafq0k49v7es73cbkvmg`, même SHA, durée 56,9 s, annonce Live à
07:43:37 GMT+2 le 8 septembre. Les GET `/api/health`, `/api/startup` et
`/api/readiness` sont **200**, version 20.7.0, `ok:true` et `database:true`.
Les trois pages mentions légales, confidentialité et conditions répondent 200.
Aucune configuration Render/Supabase modifiée dans cette étape.

Le formulaire déployé présente le champ date nommé en FR et AR. Un CV fictif
non enregistré côté serveur a été saisi ; l'aperçu restitue les sections et le
contenu. Le bouton PDF a été actionné, mais aucun fichier PDF enregistré ni
téléchargement achevé n'a été observé. L'export réel reste **non certifié**.
L'onglet temporaire a ensuite été fermé entre les tours ; aucune validation
supplémentaire de l'impression ne peut être déduite de son ancien état.

Le parcours authentifié et la réception de courriels restent en attente d'une
session/adresse de qualification autorisée, demandée à l'opérateur. Aucun compte
créé ni courriel envoyé. Brevo redirige vers sa page **Log In** : action immédiate
requise, connexion opérateur à Brevo. Aucune nouvelle clé créée, affichée ou saisie.
La révocation de l'ancienne clé exposée et le déploiement de sa remplaçante ne
sont pas confirmés. Les points sauvegarde et identité/contact légal ci-dessous
restent ouverts. Le domaine Render existant ne constitue pas un blocage technique
à lui seul.

## Correctif de synchronisation des labels — 8 septembre 2026

Cause des deux échecs FR/AR identifiée dans le code :
`syncApplicationI18n()` ajoute un `aria-label` à `appDate` et `appNotes`, notamment
via un délai de 140 ms. `ensureControlName()` ignorait tout contrôle ayant déjà
un nom ARIA. Selon l'ordre des scripts, les labels HTML explicites existaient
ou non. Le nom accessible n'était donc pas systématiquement absent ; c'était
la structure de labellisation qui dépendait de l'ordonnancement.

Le correctif conserve un label HTML explicite pour les champs connus, même si
une couche historique a déjà posé un nom ARIA. Il respecte les labels existants
et les noms des autres contrôles. La fixture des tests force désormais
`syncApplicationI18n()` avant le script d'accessibilité pour couvrir l'ordre
défaillant sans délai ajouté ni assertion affaiblie. Le total reste 181 tests.

Qualification du correctif : **181/181 réussis, 0 échec, 0 ignoré**, commande
`npm run test:ci`, sortie 0 et `RELEASE GATE PASSED` ; suites en 427,1 s.
Builds indépendants identiques, syntaxe récursive et navigateur vérifiée.
Un premier run du même correctif avait 171 succès et 10 échecs issus d'un seul
hook `Test server startup timeout` à 10 s dans la fixture backend de compte.
La relance complète ci-dessus passe sans aucune modification entre les runs,
ni suppression de test ni assouplissement d'assertion. Ce délai local intermittent
reste une limite de fiabilité de la fixture, distincte du défaut de labels corrigé.
Diff final limité au correctif, au scénario de test et aux preuves de ce rapport ;
`git diff --check` réussi. Les preuves historiques ci-dessous sont conservées.

### Points opérateur encore ouverts

- Brevo : créer manuellement une clé API de remplacement, la saisir uniquement
  dans `BREVO_API_KEY` sur Render, redéployer puis révoquer l'ancienne clé exposée.
  Ni la création/saisie ni la révocation n'ont encore été vérifiées. Aucun secret
  ne doit être transmis dans la conversation ou les logs.
- Parcours et courriels réels : adresse contrôlée/compte de test autorisé demandé,
  aucun envoi à une adresse arbitraire. Réception et liens à vérifier après rotation.
- Sauvegardes : sauvegardes gérées et PITR ne sont pas inclus dans Free ; un export
  logique hors site reste possible sur Free, recommandé par la
  [documentation Supabase](https://supabase.com/docs/guides/platform/backups).
  Le test local jetable vérifie les outils, pas l'existence d'une sauvegarde durable
  du projet. Destination privée, accès sécurisé et restauration isolée restent à établir.
- Domaine : le domaine Render HTTPS existant fonctionne ; un domaine personnalisé
  n'est pas en soi une exigence technique. Le choix de l'URL de lancement appartient
  à l'opérateur.
- Confidentialité : la page renvoie à une adresse de support non explicitement
  publiée dans son texte. Identité et coordonnées du responsable ainsi que les
  durées/critères de conservation doivent être précisés sur la base des informations
  opérateur, conformément aux [éléments d'information CNIL](https://www.cnil.fr/fr/conformite-rgpd-information-des-personnes-et-transparence).
  L'identité/statut de l'éditeur et la condition annoncée dans les mentions légales
  ne sont pas certifiés par les tests techniques. Aucune identité inventée.

## Déploiement sain vérifié le 8 septembre 2026 après correction opérateur

Ces observations remplacent le blocage d'authentification décrit ci-dessous.
Render indique **Deploy succeeded | Live** pour `dep-dafkp1on74is73affin0`,
source `2c3191d274bf13275578bae3428405c2867f9e7b`, déploiement manuel du
8 septembre à 01:45:11 GMT+2, durée 54,2 s. Les logs annoncent Live à 01:46:06.

Les GET HTTPS publics `/`, `/api/health`, `/api/startup` et `/api/readiness`
répondent tous **200**. Health retourne la version `20.7.0`, startup `ok:true`,
readiness `ok:true` avec tous les contrôles vrais, dont `database:true`.
Ce dernier contrôle exécute réellement `SELECT 1` via le pool PostgreSQL du
serveur : la connexion applicative est vérifiée, sans écriture de données.
Le pooler Supabase confirme **Connection authenticated** et **Backend authenticated**
à 01:46:05 puis 01:48:56 ; les 14 résultats de la dernière heure ne contiennent
aucun refus d'authentification. Le problème antérieur est résolu sur ce déploiement.

Contrôle navigateur public : accueil et état serveur OK, bascule FR/AR, formulaire
de compte arabe avec noms accessibles et disposition RTL lisible. Aucun compte
créé, aucun courriel envoyé et aucune donnée de production modifiée. Cela ne
certifie pas encore le parcours authentifié complet ni la livraison réelle Brevo.
La rotation de la clé Brevo, une sauvegarde durable et sa restauration, ainsi que
les validations opérateur restantes demeurent des conditions de GO.

### Gate final après correction du secret : échec

`npm run test:ci` a été relancé sur le même SHA, sans changement applicatif.
Résultat : **181 tests, 179 réussis, 2 échoués, 0 ignoré**, sortie 1.
Les deux cas `core fields and live regions are accessible (fr/ar)` échouent
dans `server/accessibility-ux.browser.test.js:30` : aucun `label[for="appDate"]`
au moment de l'assertion, au lieu d'un. Le gate final remplace donc le précédent
résultat local vert pour la décision actuelle ; le workflow GitHub antérieur
reste vert mais ne justifie pas d'ignorer cette reproduction.
Dans le navigateur en ligne, le champ date arabe possède un nom accessible après
navigation vers Candidatures. Cela ne suffit pas à expliquer ni lever l'échec
de l'assertion initiale. La cause précise doit être résolue avant un nouveau GO.

Les builds indépendants sont identiques, la syntaxe de 41 scripts / 10 fichiers
passe, ainsi que les tests TLS, mailer, compte, réseau, sessions et restauration
locale. Aucun code modifié conformément à l'instruction opérateur. Aucun nouveau
commit ni push : le gate requis est en échec. Diff du rapport contrôlé sans erreur
de whitespace. La rotation Brevo n'est pas confirmée à ce stade.

## Complément vérifié le 8 septembre 2026

Le candidat `2c3191d274bf13275578bae3428405c2867f9e7b` a un Release Gate
GitHub réussi ([34148636331](https://github.com/mbark1921-web/cv-france/actions/runs/34148636331)).
Les 181 tests locaux réussis restent la dernière qualification complète ; aucun
correctif applicatif n'a été ajouté depuis. Les constats ci-dessous remplacent
les mentions d'accès Supabase bloqué et de déploiement encore en attente plus bas.

- Render : `dep-daffeh97lnhs73fma2j0`, source `2c3191d`, est **Deploy failed**
  après 15 min 13 s. Le serveur écoute sur 3000 à 19:42:09 le 7 septembre
  (GMT+2), puis Render expire à 19:56:39 faute de succès de `/api/startup`.
  Ce candidat n'a donc pas été promu Live.
- Supabase : connexion au tableau de bord réussie. Projet déclaré **Healthy**.
  Les logs du pooler sur les dernières 24 heures montrent le 7 septembre
  à 19:56:09, :19, :29 et :39 « password authentication failed for user
  postgres », ainsi que des blocages temporaires `auth_error` pour trop d'échecs.
  Ces erreurs coïncident avec le dernier déploiement, et ne sont pas seulement
  historiques. Le code littéral `28P01` n'est pas affiché dans cette vue ;
  l'échec d'authentification est en revanche directement confirmé.
- Les 13 tables publiques ont RLS activée, aucune politique, et **API DISABLED**.
  Le tableau de bord confirme qu'elles sont inaccessibles via la Data API.
  Aucun droit ni aucune politique n'a été modifié.
- La page des sauvegardes confirme que le plan gratuit n'inclut pas les
  sauvegardes du projet. Aucune sauvegarde externe durable ni restauration
  de copie de production n'est encore vérifiée. Aucun abonnement modifié.

Blocage immédiat : l'opérateur doit corriger le mot de passe PostgreSQL dans
`DATABASE_URL` sur Render avec le mot de passe valide du projet, en encodant
correctement les caractères réservés, puis enregistrer et redéployer. Ne pas
communiquer ce secret dans la conversation. Aucune rotation n'a été effectuée.
Après cette correction restent à vérifier le lien Render–PostgreSQL de bout en
bout, les sondes publiques, le parcours en ligne et la qualification finale.
La rotation de la clé Brevo exposée lors du contrôle précédent reste nécessaire
avant la production, sous contrôle de l'opérateur.

## Référence et périmètre

Après `git fetch origin`, HEAD, origin/main et la référence GitHub main correspondent
à `fff4d59f28fe4427b23e4629b96dfa56bc4caaed`. Le workflow de référence
[34048013736](https://github.com/mbark1921-web/cv-france/actions/runs/34048013736)
est terminé avec succès. Les modifications locales préexistantes de documentation
et de qualification des builds ont été conservées. Aucun secret réel n'a été
remplacé ou ajouté au dépôt, et aucune donnée de production n'a été modifiée.

Architecture examinée : Express et JWT applicatifs, adaptateur PostgreSQL avec
transactions AsyncLocalStorage, transformation du serveur historique vers les appels
asynchrones, interface HTML bilingue construite par une chaîne de patches, API de
courriel Brevo/SMTP, migrations et restauration réservées aux bases locales isolées.
Stripe et les appels IA externes sont désactivés par le build de lancement gratuit.

## Correctifs et vérifications

- Documentation : version 20.7.0, modes Brevo/IA, URL du service existant et avertissement
  explicite sur les sauvegardes éphémères. Le nom du service est conservé pour ne pas
  changer son identité ou son URL sans connaître le domaine définitif.
- Builds : qualification dans deux copies temporaires avec comparaison SHA-256 ;
  les fichiers générés ne modifient pas le checkout. Les patches d'événements CV et
  de style de marque ne doivent plus accumuler de doublons lors des répétitions.
- Courriel (gravité moyenne) : délai Brevo de 15 secondes couvrant aussi la lecture
  du corps ; délais SMTP explicites. Aucun renvoi automatique d'une requête ambiguë.
- Courriel (gravité élevée en cas de configuration production incorrecte) : le mode
  console refuse désormais l'envoi en production avant d'afficher un lien de jeton.
  Les erreurs Brevo ne recopient plus les détails renvoyés par le fournisseur.
- Installation verrouillée : `npm ci --include=dev --ignore-scripts` réussit.
  `npm audit --json` : zéro vulnérabilité signalée, toutes gravités confondues.
- Deux builds indépendants identiques ; syntaxe navigateur : 41 scripts dans
  10 fichiers publics ; tests ciblés : 2 d'idempotence et 3 de courriel réussis.
- `git diff --check` ne signale pas d'erreur d'espacement.

La qualification complète utilise Node 24, PostgreSQL 16 portable, OpenSSL et le
Chromium Playwright installé, avec des bases jetables et sans environnement de
production hérité. Résultat final sur le code du commit
`7a5f9fd362a68718a966671e0001c78b60cea3d3` : **RELEASE GATE PASSED**,
181 tests réussis, zéro échec, zéro test ignoré, durée des suites 466,2 secondes.
Environnement : Node 24.19.0, PostgreSQL 16.15, OpenSSL 3.5.7. Les commits de
rapport ultérieurs ne modifient pas le code qualifié.

Le [Release gate GitHub 34112803285](https://github.com/mbark1921-web/cv-france/actions/runs/34112803285)
est terminé avec succès sur `912f3fc67d0af0488b7040de5fa1695d8a24a4a3`.

Premier passage complet : 181 tests, 170 réussis, 11 échoués, aucun ignoré.
Dix échecs proviennent du même hook de démarrage du serveur des comptes dépassant
10 secondes ; le onzième constate momentanément l'absence du label `appDate`.
Ces onze tests passent sur la relance hors sandbox sans changement de code.
La cause précise du comportement transitoire n'est pas établie ; il ne faut pas
présenter le premier passage comme réussi.

## Commits locaux et fichiers

- `abeab9eee1c8713d05409c49722d5ee6ae7dd234` — documentation 20.7.0.
- `acd675a1f12a0a88d96fec2d005f2c696eb48924` — qualification des builds et idempotence.
- `7a5f9fd362a68718a966671e0001c78b60cea3d3` — courriels et tests de non-régression.
- `912f3fc67d0af0488b7040de5fa1695d8a24a4a3` — rapport initial, poussé après la qualification locale verte.

Fichiers : `.env.example`, `.env.render.example`, `README.md`, `package.json`,
`server/build-check.js`, `server/ci.js`, `server/mailer.js`, `server/mailer.test.js`,
`server/patch-cv-preview-events.js`, `server/patch-idempotence.test.js`,
`server/patch-jovelya-brand-v20-7-0.js` et ce rapport.

## Production et limites restantes

Les sondes HTTPS GET `/`, `/api/health`, `/api/readiness` et `/api/startup` sur
`https://cv-france-staging.onrender.com` ont toutes expiré après 60 secondes.
Une nouvelle série après la poussée a également expiré à 45 secondes.
L'accès Render a ensuite été disponible. Le déploiement
`dep-daf99th5efls73aivc6g` utilise `912f3fc67d0af0488b7040de5fa1695d8a24a4a3` :
les logs confirment le build et le lancement sur le port 3000, mais Render attend
encore la réussite de `/api/startup`. Le dernier commit marqué « Live » par Render
est `c1c7a227ca20c2befa3306062a8bc0b42b378fac` ; les déploiements de `fff4d59`
étaient en échec. La recherche `28P01` dans les logs de la dernière heure n'a pas
de résultat : la cause historique n'est pas confirmée pour le nouveau déploiement.

Valeurs non secrètes vérifiées : `NODE_ENV=production`, `APP_STAGE=production`,
`EMAIL_MODE=brevo`, `AI_MODE=disabled`, `MAINTENANCE_MODE=off`, `REGISTRATION_MODE=open`,
`PORT=3000`, `DB_POOL_MAX=5`. DOMAIN, PUBLIC_BASE_URL et ALLOWED_ORIGIN correspondent
au domaine Render existant. Le chemin CA pointe sur le fichier secret monté.
Les adresses administrateur, support et expéditeur sont présentes et de format valide.

DATABASE_URL se parse correctement : pooler Supabase de région eu-west-2, mode
session sur 5432, base postgres, utilisateur de forme `postgres.<référence-projet>`,
mot de passe présent, sans placeholder apparent ni pourcentage mal encodé. Aucune
option TLS dans l'URL ; le code impose la vérification avec la CA configurée.
Ces contrôles ne prouvent ni la validité du mot de passe ni la réussite du handshake.

Le shell Render est indisponible sur le plan gratuit. Le projet Supabase associé
demande une connexion. **Action externe immédiate : se connecter à Supabase dans
l'onglet ouvert**, pour permettre la lecture des erreurs PostgreSQL, des droits/RLS
et de l'état des sauvegardes. Aucun changement d'offre n'a été effectué.

Incident de manipulation : l'affichage multiligne du champ Brevo a fait apparaître
la clé dans une sortie d'outil de cette session malgré le masquage prévu. Elle a
été immédiatement remasquée, sans modification ni copie dans le dépôt. Sa présence
est confirmée ; le premier contrôle « absent » était erroné. Une rotation par
l'opérateur est recommandée ; aucun remplacement de secret n'est autorisé ou réalisé.

Restent non certifiés : livraison Brevo réelle, persistance après redémarrage,
configuration et droits/RLS Supabase en ligne, sauvegardes externes durables et
restauration d'une copie de production dans une base jetable, domaine final et
coordonnées légales. Les exemples de domaine ne doivent pas être remplacés par
une identité légale ou un domaine inventé.

La CSP conserve `unsafe-inline` pour les scripts et gestionnaires historiques :
c'est une limite de défense contre les injections, pas une CSP stricte. Le schéma
local utilise les contrôles d'appartenance de l'API Express ; il ne prouve pas que
les tables Supabase sont inaccessibles aux rôles Data API. Le runbook de récupération
exige déjà cette vérification distincte. Aucun changement de RLS n'a été appliqué.

Les suites automatisées FR/AR ne remplacent pas une validation visuelle exhaustive
de tous les modèles de CV/PDF sur mobile et bureau, ni un parcours complet en ligne.
Ces validations restent nécessaires avant de déclarer le projet terminé.

## Checklist de lancement

1. Qualification locale complète verte sur le candidat, diff final vérifié et commits identifiés.
2. Poussée autorisée par ce résultat, puis Release gate GitHub vert sur le même SHA.
3. SHA Render identifié et quatre sondes publiques réussies.
4. Connexion PostgreSQL avec certificat et nom d'hôte vérifiés ; persistance et isolation confirmées.
5. Courriels de vérification et réinitialisation reçus ; parcours FR/AR et PDF validés.
6. Sauvegarde externe et restauration jetable vérifiées ; domaine et mentions légales finalisés.
