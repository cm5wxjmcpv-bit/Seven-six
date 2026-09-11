const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw3hhJZ_sq1kF8YdTUGXdFatxnWy2fgAWeO3YwXRLTfC7cDrWSFHHYrTVApYUcgnhc/exec';
const MAX_PHOTOS = 3;
const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

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
      const categories = (card.dataset.category || '').split(/\s+/);
      const shouldDim = selected !== 'all' && !categories.includes(selected);
      card.classList.toggle('dimmed', shouldDim);
    });
  });
});

const galleryLightbox = document.getElementById('galleryLightbox');

if (galleryLightbox) {
  const galleryLightboxImage = document.getElementById('galleryLightboxImage');
  const galleryLightboxCaption = document.getElementById('galleryLightboxCaption');
  const galleryLightboxClose = galleryLightbox.querySelector('.gallery-lightbox-close');

  galleryCards.forEach((card) => {
    card.addEventListener('click', () => {
      const photo = card.querySelector('img');

      if (!photo) return;

      galleryLightboxImage.src = photo.currentSrc || photo.src;
      galleryLightboxImage.alt = photo.alt;
      galleryLightboxCaption.textContent = photo.alt;
      galleryLightbox.showModal();
    });
  });

  galleryLightboxClose.addEventListener('click', () => galleryLightbox.close());

  galleryLightbox.addEventListener('click', (event) => {
    if (event.target === galleryLightbox) galleryLightbox.close();
  });
}

const form = document.getElementById('quoteForm');

if (form) {
  const photoInput = document.getElementById('photos');
  const photoSelection = document.getElementById('photoSelection');
  const submitButton = form.querySelector('.q-submit');

  const showPhotoSelection = (message, isError = false) => {
    photoSelection.textContent = message;
    photoSelection.classList.toggle('error', isError);
  };

  const validatePhotos = () => {
    const files = Array.from(photoInput.files || []);

    if (files.length > MAX_PHOTOS) {
      return { files: [], error: `Choose no more than ${MAX_PHOTOS} photos.` };
    }

    const unsupported = files.find((file) => !ALLOWED_PHOTO_TYPES.has(file.type));
    if (unsupported) {
      return { files: [], error: 'Use JPEG, PNG, or WebP photos.' };
    }

    const tooLarge = files.find((file) => file.size > MAX_PHOTO_SIZE);
    if (tooLarge) {
      return { files: [], error: 'Each photo must be 5 MB or smaller.' };
    }

    return { files, error: '' };
  };

  const resetPhotoSelection = () => {
    showPhotoSelection('Up to 3 · 5 MB each');
  };

  photoInput.addEventListener('change', () => {
    const { files, error } = validatePhotos();

    if (error) {
      photoInput.value = '';
      showPhotoSelection(error, true);
      return;
    }

    if (!files.length) {
      resetPhotoSelection();
      return;
    }

    showPhotoSelection(`${files.length} photo${files.length === 1 ? '' : 's'} selected`);
  });

  const encodePhoto = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener('load', () => {
      const result = String(reader.result || '');
      const separator = result.indexOf(',');

      if (separator === -1) {
        reject(new Error('Photo encoding failed.'));
        return;
      }

      resolve({
        name: file.name,
        type: file.type,
        size: file.size,
        data: result.slice(separator + 1)
      });
    });

    reader.addEventListener('error', () => reject(new Error('Photo reading failed.')));
    reader.readAsDataURL(file);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const status = document.getElementById('status');
    const formData = new FormData(form);
    const services = formData.getAll('services').join(', ') || 'Not specified';
    const { files, error: photoError } = validatePhotos();

    status.classList.add('show');

    if (photoError) {
      status.textContent = photoError;
      showPhotoSelection(photoError, true);
      return;
    }

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
        `Photos selected: ${files.length}`,
        '',
        'Additional Details:',
        formData.get('details') || 'None'
      ].join('\n');

      status.textContent = files.length
        ? 'Your email app is opening. Attach the selected photos, then send the email.'
        : 'Your email app is opening. Send the email to finish your request.';
      window.location.href = `mailto:76pressurewashing@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      return;
    }

    submitButton.disabled = true;
    submitButton.setAttribute('aria-busy', 'true');
    status.textContent = files.length ? 'Preparing photos...' : 'Sending...';

    try {
      formData.delete('photos');
      const encodedPhotos = await Promise.all(files.map(encodePhoto));
      formData.append('photosJson', JSON.stringify(encodedPhotos));

      status.textContent = 'Sending...';
      await fetch(SCRIPT_URL, {
        method: 'POST',
        body: formData,
        mode: 'no-cors'
      });
      status.textContent = 'Thank you. Your quote request has been sent.';
      form.reset();
      resetPhotoSelection();
    } catch (error) {
      status.textContent = 'Could not send the request. Please call 276-634-8064.';
    } finally {
      submitButton.disabled = false;
      submitButton.removeAttribute('aria-busy');
    }
  });
}
