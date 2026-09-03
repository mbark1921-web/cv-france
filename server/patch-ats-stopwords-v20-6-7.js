import fs from 'node:fs';

const file='public/index.html';
const marker='ATS_STOPWORDS_V20_6_7';
let html=fs.readFileSync(file,'utf8');

if(!html.includes(marker)){
  const anchor="'emploi','mission','missions','profil','recherche','recherché','entreprise','candidat','candidate'";
  const replacement="'emploi','mission','missions','profil','recherche','recherché','entreprise','candidat','candidate','personne','personnes','equipe','équipe','magasin'";
  if(!html.includes(anchor)) throw new Error('ATS stopword anchor not found');
  html=html.replace(anchor,replacement);
  html=html.replace('</body></html>',`<script>/* ${marker} */</script></body></html>`);
  fs.writeFileSync(file,html,'utf8');
}

console.log('Improved ATS stopwords for generic French terms.');
