import './GridMotion.css';

const GridMotion = ({ items = [], gradientColor = 'black' }) => {
  const totalItems = 28;
  const defaultItems = ["/fruit.jpg", "/cereales.jpg", "/vegetables.jpg", "/simple fish.jpg"];

  // Build combinedItems safely: accept fewer images and fill the rest with defaults
  let combinedItems = [];
  if (Array.isArray(items) && items.length > 0) {
    for (let i = 0; i < totalItems; i++) {
      combinedItems.push(items[i % items.length]);
    }
  } else {
    for (let i = 0; i < totalItems; i++) {
      combinedItems.push(defaultItems[i % defaultItems.length]);
    }
  }

  return (
    <div className="noscroll loading">
      <section
        className="intro"
        style={{
          background: `radial-gradient(circle, ${gradientColor} 0%, transparent 100%)`
        }}
      >
        <div className="gridMotion-container">
          {[...Array(4)].map((_, rowIndex) => (
            <div
              key={rowIndex}
              className={`row ${rowIndex % 2 === 0 ? 'row--forward' : 'row--reverse'}`}
              style={{ animationDelay: `${-rowIndex * 2.5}s` }}
            >
              {[...Array(14)].map((_, itemIndex) => {
                const sourceIndex = rowIndex * 7 + (itemIndex % 7);
                const content = combinedItems[sourceIndex];
                const isImage = typeof content === 'string' && /^(https?:\/\/|\/|data:image)/.test(content);
                return (
                  <div key={itemIndex} className="row__item">
                    <div className="row__item-inner" style={{ backgroundColor: '#111' }}>
                      {isImage ? (
                        <img src={encodeURI(content)} alt="" className="row__item-img" />
                      ) : (
                        <div className="row__item-content">{content}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="fullview"></div>
      </section>
    </div>
  );
};

export default GridMotion;
