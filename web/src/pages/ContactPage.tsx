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
      if (!res.ok) throw new Error(data?.error || "Une erreur est survenue.");

      setSuccess("Votre message a bien été envoyé.");
      setFirstName("");
      setLastName("");
      setEmail("");
      setMessage("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="container mx-auto max-w-4xl px-6 py-16">

      {/* TITRE */}
      <h1 className="text-4xl font-bold text-center mb-3">
        Contactez-nous
      </h1>

      {/* SOUS TITRE */}
      <p className="text-center text-gray-600 mb-12">
        Une question, un retour ou une demande&nbsp;?
        Envoyez-nous un message via ce formulaire.
      </p>

      {/* CARTE */}
      <form
        onSubmit={handleSubmit}
        className="bg-[#FAF7F1] border border-gray-200 rounded-3xl p-8 shadow-sm"
      >

        <h2 className="text-xl font-semibold mb-6">
          Vos informations
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium mb-1">
              Prénom *
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Nom *
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              required
            />
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-1">
            Adresse email *
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            required
          />
        </div>

        <div className="mb-8">
          <label className="block text-sm font-medium mb-1">
            Message *
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[140px]"
            required
          />
        </div>

        {/* ALERTES */}
        {error && (
          <p className="text-sm text-red-600 mb-4">
            {error}
          </p>
        )}

        {success && (
          <p className="text-sm text-green-700 mb-4">
            {success}
          </p>
        )}

        {/* BOUTON ALIGNÉ À DROITE */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 rounded-full bg-[#97A995] text-white font-medium disabled:opacity-60"
          >
            {submitting ? "Envoi..." : "Envoyer"}
          </button>
        </div>

      </form>
    </main>
  );
}
