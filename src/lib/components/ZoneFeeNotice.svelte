<script lang="ts">
  /**
   * Early fee + serviceability feedback, shown on the address step the moment
   * the ZIP validates. Fetches the same /api/quote the review step uses, so the
   * customer learns the on-site charge (or a coverage problem) seven steps
   * earlier than before. Advisory only — the review step re-resolves the fee
   * authoritatively before any payment.
   */
  export let zip: string;
  export let jobTypeName: string;

  const SUPPORT_PHONE = '(206) 508-2444';
  const SUPPORT_PHONE_HREF = 'tel:+12065082444';

  type Quote = {
    serviced: boolean;
    osc: number;
    zoneName: string | null;
    flag: string;
  };

  let status: 'idle' | 'loading' | 'done' = 'idle';
  let quote: Quote | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastKey = '';

  const money = (n: number) => `$${n.toLocaleString()}`;

  $: schedule(zip, jobTypeName);

  function schedule(rawZip: string, job: string) {
    const z = rawZip.trim().slice(0, 5);
    if (!/^\d{5}$/.test(z) || !job) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      status = 'idle';
      quote = null;
      lastKey = '';
      return;
    }
    const key = `${z}|${job}`;
    if (key === lastKey) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fetchQuote(key, z, job);
    }, 500);
  }

  async function fetchQuote(key: string, z: string, job: string) {
    status = 'loading';
    try {
      const res = await fetch(
        `/api/quote?zip=${encodeURIComponent(z)}&jobTypeName=${encodeURIComponent(job)}`
      );
      if (!res.ok) throw new Error(`quote ${res.status}`);
      const data = await res.json();
      lastKey = key;
      quote = {
        serviced: data.serviced === true,
        osc: Number(data.osc) || 0,
        zoneName: data.zoneName ?? null,
        flag: data.flag ?? 'none'
      };
      status = 'done';
    } catch {
      // Quiet failure — the review step re-resolves the fee authoritatively, so
      // showing nothing beats showing a scary error while they type an address.
      lastKey = '';
      status = 'idle';
      quote = null;
    }
  }
</script>

{#if status === 'loading'}
  <p class="notice checking" aria-live="polite">
    <span class="spinner" aria-hidden="true"></span>
    Checking your service area…
  </p>
{:else if status === 'done' && quote}
  {#if quote.serviced && quote.osc > 0}
    <div class="notice in-area" aria-live="polite">
      <p class="lead">
        ✓ You're in our {quote.zoneName ? `${quote.zoneName} ` : ''}service area.
      </p>
      <p class="sub">
        A <strong>{money(quote.osc)}</strong> on-site consultation charge applies for a technician
        visit. You'll see payment options at the final step — including a remote consultation with
        no visit charge.
      </p>
    </div>
  {:else if quote.serviced && quote.flag === 'none'}
    <div class="notice in-area" aria-live="polite">
      <p class="lead">
        ✓ You're in our {quote.zoneName ? `${quote.zoneName} ` : ''}service area — no on-site
        consultation charge for this service.
      </p>
    </div>
  {:else if quote.flag === 'unserviced-or-unknown'}
    <div class="notice out-of-area" aria-live="polite">
      <p class="lead">We couldn't match your ZIP to our service areas.</p>
      <p class="sub">
        You can still submit and our office will confirm coverage — or call us at
        <a href={SUPPORT_PHONE_HREF}>{SUPPORT_PHONE}</a> to check right away.
      </p>
    </div>
  {:else}
    <!-- Fee service degraded (unreachable / not configured): never claim "no
         charge" — there may be one we just can't see right now. -->
    <div class="notice unknown" aria-live="polite">
      <p class="lead">
        We couldn't confirm your area's visit charge right now. You can continue — we'll confirm
        any charge with you before scheduling.
      </p>
    </div>
  {/if}
{/if}

<style>
  .notice {
    margin-top: 0.85rem;
    padding: 0.75rem 0.9rem;
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    display: grid;
    gap: 0.25rem;
  }

  .notice.checking {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--color-muted);
    font-size: 0.9rem;
    border-style: dashed;
  }

  .notice.in-area {
    border-color: rgba(17, 163, 122, 0.35);
    background: var(--color-accent-bg);
  }

  .notice.out-of-area {
    border-color: var(--color-emergency-soft, var(--color-border));
    background: var(--color-emergency-bg);
  }

  .lead {
    margin: 0;
    font-weight: 600;
    font-size: 0.92rem;
  }

  .in-area .lead {
    color: var(--color-accent);
  }

  .out-of-area .lead {
    color: var(--color-emergency);
  }

  .unknown .lead {
    color: var(--color-muted);
    font-weight: 500;
  }

  .sub {
    margin: 0;
    font-size: 0.86rem;
    color: var(--color-text);
    line-height: 1.45;
  }

  .sub a {
    color: var(--color-primary);
    font-weight: 600;
  }

  .spinner {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 2px solid var(--color-primary-soft);
    border-top-color: var(--color-primary);
    animation: zfn-spin 0.8s linear infinite;
    flex-shrink: 0;
  }

  @keyframes zfn-spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
