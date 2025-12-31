import React, { useState } from "react";

export default function ContactPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSuccess(null);
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch(
        import.meta.env.VITE_API_URL
          ? `${import.meta.env.VITE_API_URL}/contact`
          : "/contact",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ firstName, lastName, email, message }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Une erreur est survenue.");
      }

      setSuccess("Votre message a bien été envoyé. Nous vous répondrons dès que possible.");
      setFirstName("");
      setLastName("");
      setEmail("");
      setMessage("");
    } catch (err: any) {
      setError(err.message || "Impossible d’envoyer le message pour le moment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="container mx-auto max-w-3xl px-6 py-16">
      <section className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight mb-3">
          Contact
        </h1>
        <p className="text-lg text-gray-600">
          Une question sur la plateforme, un retour ou une demande spécifique&nbsp;?
          Utilisez le formulaire ci-dessous ou écrivez-nous directement par email.
        </p>
      </section>

      <section className="mb-8 border border-gray-200 rounded-lg p-4 bg-gray-50">
        <p className="text-gray-700 mb-1">
          Vous pouvez aussi nous contacter directement à l’adresse suivante&nbsp;:
        </p>
        <p className="font-medium">
          <a href="mailto:contact@clesdesnombres.com" className="underline">
            contact@clesdesnombres.com
          </a>
        </p>
      </section>

      <section>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Prénom
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Nom
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Adresse email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 min-h-[140px]"
              required
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">
              {error}
            </p>
          )}

          {success && (
            <p className="text-sm text-green-600">
              {success}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center px-4 py-2 rounded-md border border-transparent bg-black text-white text-sm font-medium disabled:opacity-60"
          >
            {submitting ? "Envoi en cours..." : "Envoyer"}
          </button>
        </form>
      </section>
    </main>
  );
}
