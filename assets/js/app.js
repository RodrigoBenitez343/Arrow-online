const parallaxBackground = document.querySelector('.parallax-bg');

if (parallaxBackground) {
  const updateParallax = () => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const imageAspectRatio = 2048 / 1024;
    const renderedHeight = viewportWidth * imageAspectRatio;
    const extraHeight = Math.max(0, renderedHeight - viewportHeight);
    const baseOffset = -extraHeight;
    const maxScrollable = Math.max(1, document.documentElement.scrollHeight - viewportHeight);
    const scrollProgress = Math.min(window.scrollY / maxScrollable, 1);
    const scrollOffset = extraHeight * scrollProgress;

    parallaxBackground.style.setProperty('--parallax-base', `${baseOffset}px`);
    parallaxBackground.style.setProperty('--parallax-offset', `${scrollOffset}px`);
  };

  updateParallax();
  window.addEventListener('scroll', updateParallax, { passive: true });
  window.addEventListener('resize', updateParallax);
}
