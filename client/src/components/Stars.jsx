import { Star } from 'lucide-react';

/** Read-only star rating. */
export function Stars({ value, size = 14 }) {
  return (
    <span className="stars" role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map(i => <Star key={i} size={size} aria-hidden="true" className={i <= Math.round(value) ? 'on' : ''} />)}
    </span>
  );
}

/** Keyboard-accessible star picker (radio group). */
export function StarPicker({ value, onChange }) {
  return (
    <div className="star-picker" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map(i => (
        <button key={i} type="button" role="radio" aria-checked={value === i} aria-label={`${i} star${i > 1 ? 's' : ''}`}
          className={i <= value ? 'on' : ''} onClick={() => onChange(i)}>
          <Star size={30} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

/** Small rating chip; hidden until an item has real reviews. */
export function RatingChip({ rating, count }) {
  if (rating == null) return null;
  return <span className="rating" title={`${count} review${count === 1 ? '' : 's'}`}><Star size={11} aria-hidden="true" /> {rating}<span className="sr-only"> out of 5 from {count} reviews</span></span>;
}
