import { useNavigate } from 'react-router'
import { createPropiedad } from '@/api/propertyApi'
import { PageHeader } from '@/components/panel/PageHeader'
import { PropertyForm } from '@/components/property/PropertyForm'

/**
 * Publicar propiedad (`POST /propiedades`). Nace DISPONIBLE y a nombre de quien la publica (docs §2).
 * Al terminar lleva a la gestión de la propiedad, en la sección de fotos (docs §6: después de crear, fotos).
 */
export default function PropertyCreatePage() {
  const navigate = useNavigate()

  return (
    <div className="max-w-7xl space-y-8">
      <PageHeader
        title="Publicar propiedad"
        description="Completa los datos y marca la ubicación. Después de publicarla podrás agregar las fotos."
      />
      <PropertyForm
        initial={null}
        submitLabel="Publicar propiedad"
        savingLabel="Publicando propiedad"
        onCancel={() => navigate('/panel/propiedades')}
        onSubmit={async (payload) => {
          const created = await createPropiedad(payload)
          navigate(`/panel/propiedades/${created.id}?seccion=fotos`, { replace: true, state: { published: true } })
        }}
      />
    </div>
  )
}
