const SCRIPT_URL = '';

const galleryFilters = document.querySelectorAll('.gallery-filter');
const galleryCards = document.querySelectorAll('.gallery-card');

galleryFilters.forEach((button) => {
  button.addEventListener('click', () => {
    const selected = button.dataset.filter;

    galleryFilters.forEach((filterButton) => {
      const isActive = filterButton === button;
      filterButton.classList.toggle('active', isActive);
      filterButton.setAttribute('aria-pressed', String(isActive));
    });

    galleryCards.forEach((card) => {
      const shouldDim = selected !== 'all' && card.dataset.category !== selected;
      card.classList.toggle('dimmed', shouldDim);
    });
  });
});

const form = document.getElementById('quoteForm');

if (form) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const status = document.getElementById('status');
    const formData = new FormData(form);
    const services = formData.getAll('services').join(', ') || 'Not specified';

    status.classList.add('show');

    if (!SCRIPT_URL) {
      const subject = `Quote Request - ${formData.get('name') || 'Website Customer'}`;
      const body = [
        'New quote request from the Seven Six Pressure Washing website',
        '',
        `Name: ${formData.get('name') || ''}`,
        `Phone: ${formData.get('phone') || ''}`,
        `Email: ${formData.get('email') || ''}`,
        `Property Address: ${formData.get('address') || ''}`,
        `Property Type: ${formData.get('propertyType') || ''}`,
        `Square Footage: ${formData.get('squareFeet') || 'Not provided'}`,
        `Services: ${services}`,
        `Preferred Contact: ${formData.get('contactMethod') || 'Not specified'}`,
        `Best Time: ${formData.get('bestTime') || 'Not specified'}`,
        '',
        'Additional Details:',
        formData.get('details') || 'None'
      ].join('\n');

      status.textContent = 'Your email app is opening. Send the email to finish your request.';
      window.location.href = `mailto:76pressurewashing@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      return;
    }

    status.textContent = 'Sending...';

    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        body: formData,
        mode: 'no-cors'
      });
      status.textContent = 'Thank you. Your quote request has been sent.';
      form.reset();
    } catch (error) {
      status.textContent = 'Could not send the request. Please call 276-634-8064.';
    }
  });
}
