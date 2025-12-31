import React, { useState } from "react";

export default function ContactPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<null | "ok" | "error">(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);

    const res = await fetch("/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName, email, message }),
    });

    if (res.ok) {
      setStatus("ok");
      setFirstName("");
      setLastName("");
      setEmail("");
      setMessage("");
    } else {
      setStatus("error");
    }
  }

  return (
    <main className="contact-container">

      <h1 className="contact-title">
        Contactez-nous
      </h1>

      <p className="contact-subtitle">
        Une question&nbsp;? Un retour&nbsp;? Envoyez-nous un message.
      </p>

      <form onSubmit={handleSubmit} className="contact-card">

        <h2 className="contact-card-title">Vos informations</h2>

        <div className="contact-grid">
          <div>
            <label>Prénom *</label>
            <input
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              required
            />
          </div>

          <div>
            <label>Nom *</label>
            <input
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="contact-field">
          <label>Email *</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="contact-field">
          <label>Message *</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            required
          />
        </div>

        {status === "ok" && (
          <p className="contact-success">
            Message envoyé avec succès.
          </p>
        )}

        {status === "error" && (
          <p className="contact-error">
            Une erreur est survenue.
          </p>
        )}

        <div className="contact-button-row">
          <button type="submit">
            Envoyer
          </button>
        </div>

      </form>
    </main>
  );
}
