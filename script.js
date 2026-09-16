/* ============================================================
   MIRAJ Recouvrement — script.js (Refonte moderne)
   Features:
   - Sticky header with glassmorphism
   - Hero carousel with auto-advance
   - Scroll reveal animations
   - Stats counter animation
   - FAQ accordion
   - Navigation dropdown
   - Hamburger menu
   - Back-to-top button
   - Contact form validation
   ============================================================ */

'use strict';

document.addEventListener('DOMContentLoaded', () => {

  /* ==================== HEADER ==================== */
  const header = document.getElementById('header');

  const onScroll = () => {
    header.classList.toggle('is-scrolled', window.scrollY > 40);
    document.getElementById('back-top').classList.toggle('is-visible', window.scrollY > 400);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ==================== HAMBURGER / MOBILE MENU ==================== */
  const hamburger = document.getElementById('hamburger');
  const nav = document.getElementById('main-nav');

  hamburger.addEventListener('click', () => {
    const isOpen = hamburger.classList.toggle('is-open');
    nav.classList.toggle('is-open', isOpen);
    hamburger.setAttribute('aria-expanded', String(isOpen));
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  // Close nav on link click (mobile)
  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('is-open');
      nav.classList.remove('is-open');
      hamburger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });

  /* ==================== DROPDOWN ==================== */
  const dropdowns = document.querySelectorAll('.nav__dropdown');

  dropdowns.forEach(dropdown => {
    const toggle = dropdown.querySelector('.nav__dropdown-toggle');

    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = dropdown.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(isOpen));
      // Close others
      dropdowns.forEach(d => {
        if (d !== dropdown) {
          d.classList.remove('is-open');
          d.querySelector('.nav__dropdown-toggle').setAttribute('aria-expanded', 'false');
        }
      });
    });
  });

  // Close dropdowns on outside click
  document.addEventListener('click', () => {
    dropdowns.forEach(d => {
      d.classList.remove('is-open');
      d.querySelector('.nav__dropdown-toggle').setAttribute('aria-expanded', 'false');
    });
  });

  // Smooth scroll for dropdown service links
  document.querySelectorAll('.nav__dropdown-menu a[data-domain]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const domain = link.getAttribute('data-domain');
      const target = document.getElementById(domain);
      if (target) {
        const offset = target.getBoundingClientRect().top + window.scrollY - 100;
        window.scrollTo({ top: offset, behavior: 'smooth' });
      }
    });
  });

  /* ==================== HERO CAROUSEL ==================== */
  const slides = document.querySelectorAll('.hero__slide');
  const dotsContainer = document.querySelector('.hero__dots');
  let currentSlide = 0;
  let carouselTimer = null;

  // Build dots
  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = `hero__dot${i === 0 ? ' is-active' : ''}`;
    dot.setAttribute('aria-label', `Slide ${i + 1}`);
    dot.setAttribute('role', 'tab');
    dot.addEventListener('click', () => goToSlide(i));
    dotsContainer.appendChild(dot);
  });

  const getDots = () => document.querySelectorAll('.hero__dot');

  function goToSlide(index) {
    slides[currentSlide].classList.remove('hero__slide--active');
    getDots()[currentSlide].classList.remove('is-active');

    currentSlide = (index + slides.length) % slides.length;

    slides[currentSlide].classList.add('hero__slide--active');
    getDots()[currentSlide].classList.add('is-active');

    resetTimer();
  }

  function nextSlide() { goToSlide(currentSlide + 1); }
  function prevSlide() { goToSlide(currentSlide - 1); }

  function resetTimer() {
    clearInterval(carouselTimer);
    carouselTimer = setInterval(nextSlide, 5500);
  }

  document.querySelector('.hero__arrow--next').addEventListener('click', () => {
    nextSlide();
  });
  document.querySelector('.hero__arrow--prev').addEventListener('click', () => {
    prevSlide();
  });

  // Keyboard navigation
  document.querySelector('.hero').addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') nextSlide();
    if (e.key === 'ArrowLeft') prevSlide();
  });

  // Touch/swipe support
  let touchStartX = 0;
  const heroEl = document.querySelector('.hero');
  heroEl.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });
  heroEl.addEventListener('touchend', (e) => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) diff > 0 ? nextSlide() : prevSlide();
  }, { passive: true });

  resetTimer();

  /* ==================== SCROLL REVEAL ==================== */
  const revealEls = document.querySelectorAll('.reveal');

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Stagger siblings
        const siblings = entry.target.parentElement.querySelectorAll('.reveal');
        let delay = 0;
        siblings.forEach(sib => {
          if (!sib.classList.contains('is-visible')) {
            setTimeout(() => sib.classList.add('is-visible'), delay);
            delay += 100;
          }
        });
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

  revealEls.forEach(el => revealObserver.observe(el));

  /* ==================== STATS COUNTER ==================== */
  const statValues = document.querySelectorAll('.stat-card__value[data-target]');

  function animateCounter(el) {
    const target = parseInt(el.getAttribute('data-target'), 10);
    const prefix = el.getAttribute('data-prefix') || '';
    const suffix = el.getAttribute('data-suffix') || '';
    const duration = 1800;
    const start = performance.now();

    function update(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * target);
      el.textContent = `${prefix}${current}${suffix}`;
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }

  const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        statsObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  statValues.forEach(el => statsObserver.observe(el));

  /* ==================== FAQ ACCORDION ==================== */
  const faqItems = document.querySelectorAll('.faq__item');

  faqItems.forEach(item => {
    const btn = item.querySelector('.faq__question');
    btn.addEventListener('click', () => {
      const isOpen = item.classList.contains('is-open');

      // Close all
      faqItems.forEach(fi => {
        fi.classList.remove('is-open');
        fi.querySelector('.faq__question').setAttribute('aria-expanded', 'false');
      });

      // Open clicked (toggle)
      if (!isOpen) {
        item.classList.add('is-open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  /* ==================== BACK TO TOP ==================== */
  document.getElementById('back-top').addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* ==================== SMOOTH SCROLL (anchor links) ==================== */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (href === '#' || href === '#top') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        const offset = target.getBoundingClientRect().top + window.scrollY - 90;
        window.scrollTo({ top: offset, behavior: 'smooth' });
      }
    });
  });

  /* ==================== CONTACT FORM ==================== */
  const form = document.getElementById('contact-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let valid = true;

      // Clear previous errors
      form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
      form.querySelectorAll('.form-error-msg').forEach(el => el.remove());

      // Validate required fields
      form.querySelectorAll('[required]').forEach(field => {
        if (!field.value.trim()) {
          field.classList.add('error');
          valid = false;
        }
      });

      // Validate email format
      const emailField = form.querySelector('#email');
      if (emailField && emailField.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailField.value)) {
        emailField.classList.add('error');
        valid = false;
      }

      if (valid) {
        // Show success state
        const btn = form.querySelector('button[type="submit"]');
        const originalContent = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-check"></i> <span>Message envoyé !</span>';
        btn.style.background = 'linear-gradient(135deg, #38a169 0%, #2f855a 100%)';
        btn.disabled = true;

        setTimeout(() => {
          btn.innerHTML = originalContent;
          btn.style.background = '';
          btn.disabled = false;
          form.reset();
        }, 4000);
      }
    });

    // Clear error on input
    form.querySelectorAll('input, select, textarea').forEach(field => {
      field.addEventListener('input', () => field.classList.remove('error'));
    });
  }

  /* ==================== ACTIVE NAV LINK (scroll spy) ==================== */
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav__link[href^="#"]');

  const spyObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        navLinks.forEach(link => {
          link.classList.toggle('nav__link--active', link.getAttribute('href') === `#${id}`);
        });
      }
    });
  }, { threshold: 0.4 });

  sections.forEach(s => spyObserver.observe(s));

  /* ==================== DYNAMIC CONTENT LOADING FROM CMS ==================== */
  async function loadDynamicContent() {
    try {
      const res = await fetch('/api/content');
      if (!res.ok) return;
      const content = await res.json();
      for (const [key, val] of Object.entries(content)) {
        if (!val) continue;
        document.querySelectorAll(`[data-content-key="${key}"]`).forEach(el => {
          if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            el.value = val;
          } else if (el.tagName === 'A' && el.href.startsWith('tel:')) {
            el.href = `tel:${val.replace(/\s+/g, '')}`;
            el.textContent = val;
          } else if (el.tagName === 'A' && el.href.startsWith('mailto:')) {
            el.href = `mailto:${val}`;
            el.textContent = val;
          } else {
            el.textContent = val;
          }
        });
      }
    } catch (e) {
      console.warn('CMS content dynamic load skipped:', e);
    }
  }
  loadDynamicContent();

});
