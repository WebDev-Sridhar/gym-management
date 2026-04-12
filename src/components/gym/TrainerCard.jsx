export default function TrainerCard({ trainer, themeColor }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
      {/* Image */}
      <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
        {trainer.image_url ? (
          <img
            src={trainer.image_url}
            alt={trainer.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold"
              style={{ backgroundColor: themeColor }}
            >
              {trainer.name.charAt(0).toUpperCase()}
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-5">
        <h3 className="font-bold text-gray-900 text-lg">{trainer.name}</h3>
        {trainer.specialization && (
          <p
            className="text-sm font-medium mt-1"
            style={{ color: themeColor }}
          >
            {trainer.specialization}
          </p>
        )}
        {trainer.bio && (
          <p className="text-sm text-gray-500 mt-2 line-clamp-3">{trainer.bio}</p>
        )}
      </div>
    </div>
  )
}
