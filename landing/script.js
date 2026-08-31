(() => {
  const prefersReduced =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const revealEls = Array.from(document.querySelectorAll(".reveal"));
  if (!prefersReduced && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      },
      { threshold: 0.12, rootMargin: "40px 0px -10% 0px" },
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-in"));
  }

  // Gentle blob drift
  if (!prefersReduced) {
    const a = document.querySelector(".blob--a");
    const b = document.querySelector(".blob--b");
    if (a && b) {
      let raf = 0;
      const onMove = (ev) => {
        const x = (ev.clientX / window.innerWidth - 0.5) * 12;
        const y = (ev.clientY / window.innerHeight - 0.5) * 12;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          a.style.transform = `translate(${x}px, ${y}px)`;
          b.style.transform = `translate(${-x}px, ${-y}px)`;
        });
      };
      window.addEventListener("mousemove", onMove, { passive: true });
    }
  }
})();
