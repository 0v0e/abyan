(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const tabs = [...document.querySelectorAll("[data-tab-target]")];
  const panels = [...document.querySelectorAll("[data-panel]")];

  let typingRun = 0;
  let typingTimer = 0;
  let activationRun = 0;

  const restoreCommands = () => {
    typingRun += 1;
    window.clearTimeout(typingTimer);

    panels.forEach((panel) => {
      const command = panel.querySelector("[data-panel-command]");
      const line = command?.closest(".command-line");

      if (command) {
        command.textContent = command.dataset.panelCommand;
      }

      line?.classList.remove("is-typing");
    });
  };

  const typePanelCommand = (panel) => {
    const command = panel.querySelector("[data-panel-command]");
    const line = command?.closest(".command-line");

    if (!command) {
      return;
    }

    const text = command.dataset.panelCommand;

    if (reduceMotion.matches) {
      command.textContent = text;
      return;
    }

    const run = ++typingRun;
    let index = 0;

    command.textContent = "";
    line?.classList.add("is-typing");

    const typeNext = () => {
      if (run !== typingRun) {
        return;
      }

      index += 1;
      command.textContent = text.slice(0, index);

      if (index < text.length) {
        typingTimer = window.setTimeout(typeNext, 14);
      } else {
        typingTimer = window.setTimeout(() => {
          if (run === typingRun) {
            line?.classList.remove("is-typing");
          }
        }, 120);
      }
    };

    typeNext();
  };

  const activateTab = (
    name,
    { moveFocus = false, updateHash = true } = {},
  ) => {
    const activeTab = tabs.find((tab) => tab.dataset.tabTarget === name);
    const activePanel = panels.find((panel) => panel.dataset.panel === name);

    if (!activeTab || !activePanel) {
      return;
    }

    restoreCommands();
    const activation = ++activationRun;

    tabs.forEach((tab) => {
      const selected = tab === activeTab;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });

    panels.forEach((panel) => {
      const selected = panel === activePanel;
      panel.hidden = !selected;
      panel.classList.toggle("is-active", selected);
    });

    if (moveFocus) {
      activeTab.focus();
    }

    if (updateHash) {
      window.history.replaceState(null, "", `#${name}`);
    }

    window.requestAnimationFrame(() => {
      if (activation === activationRun) {
        typePanelCommand(activePanel);
      }
    });
  };

  tabs.forEach((tab, tabIndex) => {
    tab.addEventListener("click", () => {
      activateTab(tab.dataset.tabTarget);
    });

    tab.addEventListener("keydown", (event) => {
      let nextIndex = tabIndex;

      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        nextIndex = (tabIndex + 1) % tabs.length;
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        nextIndex = (tabIndex - 1 + tabs.length) % tabs.length;
      } else if (event.key === "Home") {
        nextIndex = 0;
      } else if (event.key === "End") {
        nextIndex = tabs.length - 1;
      } else {
        return;
      }

      event.preventDefault();
      activateTab(tabs[nextIndex].dataset.tabTarget, { moveFocus: true });
    });
  });

  window.addEventListener("hashchange", () => {
    const name = window.location.hash.slice(1);

    if (tabs.some((tab) => tab.dataset.tabTarget === name)) {
      activateTab(name, { updateHash: false });
    }
  });

  const requestedPanel = window.location.hash.slice(1);
  const initialPanel = tabs.some(
    (tab) => tab.dataset.tabTarget === requestedPanel,
  )
    ? requestedPanel
    : "profile";

  activateTab(initialPanel, { updateHash: false });

  const enableCursor = () => {
    const cursor = document.querySelector(".custom-cursor");

    if (!cursor || !finePointer.matches || reduceMotion.matches) {
      return;
    }

    let targetX = -32;
    let targetY = -32;
    let currentX = -32;
    let currentY = -32;
    let animationFrame = 0;

    const draw = () => {
      currentX += (targetX - currentX) * 0.72;
      currentY += (targetY - currentY) * 0.72;
      cursor.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`;

      if (
        Math.abs(targetX - currentX) > 0.1 ||
        Math.abs(targetY - currentY) > 0.1
      ) {
        animationFrame = window.requestAnimationFrame(draw);
      } else {
        animationFrame = 0;
      }
    };

    const queueDraw = () => {
      if (!animationFrame) {
        animationFrame = window.requestAnimationFrame(draw);
      }
    };

    window.addEventListener(
      "pointermove",
      (event) => {
        if (event.pointerType === "touch") {
          return;
        }

        targetX = event.clientX;
        targetY = event.clientY;
        document.body.classList.add("has-custom-cursor");
        cursor.classList.add("is-visible");
        queueDraw();
      },
      { passive: true },
    );

    document.addEventListener("pointerleave", () => {
      cursor.classList.remove("is-visible");
    });

    document.addEventListener("pointerenter", () => {
      cursor.classList.add("is-visible");
    });

    document.querySelectorAll("a, button").forEach((element) => {
      element.addEventListener("pointerenter", () => {
        cursor.classList.add("is-hovering");
      });
      element.addEventListener("pointerleave", () => {
        cursor.classList.remove("is-hovering");
      });
    });
  };

  enableCursor();
})();
