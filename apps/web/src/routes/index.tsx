import type { KnowledgeAudience } from "@software-journey/contracts";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const [audience, setAudience] = useState<KnowledgeAudience>("human");
  return (
    <main>
      <header>
        <a className="brand" href="/">
          <span className="brand-mark" aria-hidden="true">
            ✦
          </span>
          software journey
        </a>
        <span className="status">
          <span aria-hidden="true">◈</span> Survey / 001
        </span>
      </header>
      <section className="intro" aria-labelledby="title">
        <div className="intro-copy">
          <p className="eyebrow">
            <span aria-hidden="true">✦</span> Field guide / local first
          </p>
          <h1 id="title">
            Read the code.
            <br />
            <span className="title-accent">Follow the story.</span>
          </h1>
          <p className="lede">
            Turn a repository, its documentation, and its history into a place
            to learn. Start with the big picture. Follow the evidence into the
            details.
          </p>
          <a className="jump" href="#direction">
            Light the lantern <span aria-hidden="true">↓</span>
          </a>
        </div>
        <div className="survey-scene" aria-hidden="true">
          <span className="scene-moon" />
          <span className="scene-ridge scene-ridge-back" />
          <span className="scene-ridge scene-ridge-front" />
          <span className="scene-crystal scene-crystal-one" />
          <span className="scene-crystal scene-crystal-two" />
          <span className="scene-lantern">
            <i />
          </span>
          <span className="scene-rope" />
        </div>
      </section>
      <section id="direction" aria-labelledby="direction-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Survey routes</p>
            <h2 id="direction-title">One repository. Two ways in.</h2>
          </div>
          <span>Planned experience</span>
        </div>
        <fieldset className="audience" aria-label="Choose an audience">
          <button
            type="button"
            aria-pressed={audience === "human"}
            onClick={() => setAudience("human")}
          >
            For developers
          </button>
          <button
            type="button"
            aria-pressed={audience === "agent"}
            onClick={() => setAudience("agent")}
          >
            For AI agents
          </button>
        </fieldset>
        <article className="vision" aria-live="polite">
          <span className="index">
            <span aria-hidden="true">◈</span>{" "}
            {audience === "human" ? "01 / LEARN" : "02 / EXPLORE"}
          </span>
          <h3>
            {audience === "human"
              ? "Find your bearings, then follow your curiosity."
              : "Get the right context for the next decision."}
          </h3>
          <p>
            {audience === "human"
              ? "An architecture overview, a guided first contribution, and explanations of the decisions that shaped the project. Every explanation should lead back to its source."
              : "A compact repository map, targeted source retrieval, and explicit context budgets. Measure whether agents use fewer tokens and tool calls while still getting the answer right."}
          </p>
        </article>
      </section>
      <section className="next" aria-labelledby="next-title">
        <div>
          <p className="eyebrow">First expedition</p>
          <h2 id="next-title">OpenSpec, explained.</h2>
          <p>
            Our first planned case study is the tool we use to specify this
            application.
          </p>
          <a href="https://github.com/Fission-AI/OpenSpec">
            Visit the OpenSpec repository ↗
          </a>
        </div>
        <aside>
          <span className="aside-mark" aria-hidden="true">
            ✦
          </span>
          <strong>Scaffold ready</strong>
          <p>
            Repository analysis is not implemented yet. No repository has been
            imported, and no AI provider is connected.
          </p>
        </aside>
      </section>
      <footer>
        <span>
          <span className="footer-mark" aria-hidden="true">
            ⌁
          </span>{" "}
          Built to make software understandable.
        </span>
        <span>Local first. Evidence at every step.</span>
      </footer>
    </main>
  );
}
