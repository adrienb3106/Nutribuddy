export default function InfoPage() {
  return (
    <section className="page">
      <header className="page-header">
        <div>
          <div className="eyebrow">Transparence</div>
          <h1 className="page-title">Sources & informations legales</h1>
          <p className="page-subtitle">
            Cette page explique l'origine des donnees, le choix des sources et
            les mentions de copyright.
          </p>
        </div>
      </header>

      <div className="grid">
        <div className="panel">
          <h2 className="section-title">Credits & technologies</h2>
          <div className="stack">
            <p className="notice">
              Application developpee par Adrien Bangma.
            </p>
            <p className="notice">
              Stack principale: Python, Django/DRF, PostgreSQL, Docker, Next.js, TypeScript.
            </p>
          </div>
        </div>

        <div className="panel">
          <h2 className="section-title">Origine des sources</h2>
          <div className="stack">
            <div>
              <strong>CIQUAL (ANSES, France)</strong>
              <p className="notice">
                Table officielle de composition nutritionnelle. Dans ce projet,
                les imports proviennent du fichier CIQUAL 2025 (ex: 
                <code>data/Table Ciqual 2025_FR_2025_11_03.xls</code>).
              </p>
            </div>
            <div>
              <strong>Open Food Facts</strong>
              <p className="notice">
                Base communautaire internationale de produits alimentaires
                (codes-barres, marques, labels, ingredients). Nous utilisons un
                export FR minimal (ex: 
                <code>data/openfoodfacts-products.fr.food.min.jsonl.gz</code>).
              </p>
            </div>
          </div>
        </div>

        <div className="panel">
          <h2 className="section-title">Pourquoi ces sources</h2>
          <div className="stack">
            <p className="notice">
              CIQUAL apporte une reference scientifique stable pour les aliments
              de base. Open Food Facts complete avec les produits packages
              et les metadonnees commerciales (marques, labels, nutri-score).
            </p>
            <p className="notice">
              Ensemble, ces deux sources couvrent les usages reels : cuisine
              maison (CIQUAL) et produits du commerce (OFF).
            </p>
          </div>
        </div>

        <div className="panel">
          <h2 className="section-title">Copyright & marques</h2>
          <div className="stack">
            <p className="notice">
              Les marques, noms de produits et logos restent la propriete de
              leurs detenteurs respectifs.
            </p>
            <p className="notice">
              Les donnees CIQUAL et Open Food Facts sont soumises a leurs
              licences respectives. Pour un usage commercial ou une redistribution
              externe, verifiez les licences officielles de chaque source.
            </p>
          </div>
        </div>

        <div className="panel">
          <h2 className="section-title">Limites & responsabilites</h2>
          <div className="stack">
            <p className="notice">
              Les valeurs nutritionnelles sont donnees a titre indicatif. Ce
              produit ne remplace pas un avis medical ou dietetique.
            </p>
            <p className="notice">
              Les importations et tags sont automatisees : certaines donnees
              peuvent etre incompletes ou manquer de contexte.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
