type PlaceholderPageProps = {
  title: string;
};

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <section>
      <div className="page-header">
        <h1 className="page-header__title">{title}</h1>
        <p className="page-header__subtitle">
          Esta pantalla se desarrollará siguiendo el diseño definido en los mockups.
        </p>
      </div>

      <div className="card" style={{ padding: "28px" }}>
        <p style={{ margin: 0, color: "var(--color-muted)" }}>
          Módulo pendiente de implementar.
        </p>
      </div>
    </section>
  );
}