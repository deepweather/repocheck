import { useEffect, useState } from "react";

interface Props {
  onSaved?: () => void;
  isOnboarding?: boolean;
}

export default function Settings({ onSaved, isOnboarding }: Props) {
  const [provider, setProvider] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [hasOpenai, setHasOpenai] = useState(false);
  const [hasAnthropic, setHasAnthropic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setProvider(data.provider || "");
        setHasOpenai(data.has_openai_key);
        setHasAnthropic(data.has_anthropic_key);
      })
      .catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    const params = new URLSearchParams();
    if (provider) params.set("provider", provider);
    if (openaiKey) params.set("openai_api_key", openaiKey);
    if (anthropicKey) params.set("anthropic_api_key", anthropicKey);

    await fetch(`/api/settings?${params}`, { method: "POST" });
    setSaving(false);
    setSaved(true);
    if (openaiKey) setHasOpenai(true);
    if (anthropicKey) setHasAnthropic(true);
    setTimeout(() => setSaved(false), 2000);
    onSaved?.();
  };

  return (
    <div className={isOnboarding ? "settings settings--onboarding" : "settings"}>
      {isOnboarding && (
        <div className="settings__welcome">
          <h2>Set up repocheck</h2>
          <p>Add an API key to enable AI-powered commit classification. Without one, repocheck uses heuristic pattern matching.</p>
        </div>
      )}

      <div className="settings__section">
        <label className="settings__label">Provider</label>
        <div className="settings__radios">
          <button
            className={`settings__radio ${provider === "openai" ? "settings__radio--active" : ""}`}
            onClick={() => setProvider("openai")}
          >
            OpenAI
          </button>
          <button
            className={`settings__radio ${provider === "anthropic" ? "settings__radio--active" : ""}`}
            onClick={() => setProvider("anthropic")}
          >
            Anthropic
          </button>
        </div>
      </div>

      {(provider === "openai" || !provider) && (
        <div className="settings__section">
          <label className="settings__label">
            OpenAI API key
            {hasOpenai && !openaiKey && <span className="settings__saved-badge">saved</span>}
          </label>
          <input
            type="password"
            className="settings__input"
            placeholder={hasOpenai ? "••••••••••••••••" : "sk-..."}
            value={openaiKey}
            onChange={(e) => setOpenaiKey(e.target.value)}
            spellCheck={false}
          />
        </div>
      )}

      {provider === "anthropic" && (
        <div className="settings__section">
          <label className="settings__label">
            Anthropic API key
            {hasAnthropic && !anthropicKey && <span className="settings__saved-badge">saved</span>}
          </label>
          <input
            type="password"
            className="settings__input"
            placeholder={hasAnthropic ? "••••••••••••••••" : "sk-ant-..."}
            value={anthropicKey}
            onChange={(e) => setAnthropicKey(e.target.value)}
            spellCheck={false}
          />
        </div>
      )}

      <div className="settings__actions">
        <button
          className="btn btn-primary"
          onClick={save}
          disabled={saving || (!openaiKey && !anthropicKey && !provider)}
        >
          {saving ? "Saving…" : saved ? "Saved" : isOnboarding ? "Continue" : "Save"}
        </button>
        {isOnboarding && (
          <button className="settings__skip" onClick={onSaved}>
            Skip — use heuristic mode
          </button>
        )}
      </div>
    </div>
  );
}
