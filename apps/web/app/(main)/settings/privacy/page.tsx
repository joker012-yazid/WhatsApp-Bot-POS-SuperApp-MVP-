export default function PrivacyNoticePage() {
  return (
    <div className="stats-grid" style={{ gap: '1.5rem' }}>
      <section>
        <h2 className="heading">Privacy Notice (PDPA)</h2>
        <p className="subheading">
          Makluman ringkas pemprosesan data peribadi untuk SPEC-1 WhatsApp Bot + POS SuperApp.
        </p>
      </section>
      <section className="stat-card">
        <h3 className="heading">Data yang dikumpul</h3>
        <ul className="list">
          <li>Butiran pelanggan: nama, nombor telefon, alamat e-mel dan sejarah pembelian.</li>
          <li>Perbualan WhatsApp bagi tujuan sokongan pelanggan dan pematuhan SLA.</li>
          <li>Log transaksi POS termasuk kaedah pembayaran dan nombor resit.</li>
        </ul>
      </section>
      <section className="stat-card">
        <h3 className="heading">Tujuan</h3>
        <ul className="list">
          <li>Menyediakan sokongan pelanggan dan automasi maklum balas.</li>
          <li>Mengurus jualan, inventori, serta pematuhan cukai SST 6%.</li>
          <li>Audit keselamatan, kawalan akses RBAC, dan pemantauan prestasi (p95 ≤ 300ms).</li>
        </ul>
      </section>
      <section className="stat-card">
        <h3 className="heading">Hak & Kawalan</h3>
        <ul className="list">
          <li>Permintaan akses/pembetulan data boleh dihantar kepada pentadbir sistem.</li>
          <li>Data sensitif dilindungi melalui log redaksi PII, 2FA TOTP untuk ADMIN dan reCAPTCHA.</li>
          <li>Backup harian disulitkan sebelum dihantar ke MinIO dan disimpan mengikut polisi retensi.</li>
        </ul>
      </section>
    </div>
  );
}
