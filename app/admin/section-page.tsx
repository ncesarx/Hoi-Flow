type SectionPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  phase: string;
};

export function SectionPage({
  eyebrow,
  title,
  description,
  phase,
}: SectionPageProps) {
  return (
    <div className="hf-page">
      <section className="hf-page-heading">
        <div>
          <span className="hf-eyebrow">
            {eyebrow}
          </span>

          <h1>
            {title}
          </h1>

          <p>
            {description}
          </p>
        </div>

        <span className="hf-module-chip">
          {phase}
        </span>
      </section>

      <section className="hf-empty-state">
        <div className="hf-empty-logo">
          HF
        </div>

        <span className="hf-eyebrow">
          Hoi-Flow
        </span>

        <h2>
          Módulo preparado
        </h2>

        <p>
          A estrutura administrativa
          deste módulo já está pronta
          para receber as funções da
          próxima etapa.
        </p>
      </section>
    </div>
  );
}
