import { useEffect, useState } from 'react'

function Services() {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchServices = () => {
      fetch('/api/services')
        .then(response => {
          if (!response.ok) {
            throw new Error('Unable to retrieve service status')
          }

          return response.json()
        })
        .then(data => {
          setServices(data)
          setError('')
        })
        .catch(requestError => {
          setError(requestError.message)
        })
        .finally(() => {
          setLoading(false)
        })
    }

    fetchServices()

    const interval = setInterval(fetchServices, 10000)

    return () => clearInterval(interval)
  }, [])

  return (
    <>
      <h1>Services</h1>

      <div className="panel">
        {loading && <p>Checking services...</p>}

        {error && (
          <p className="service-error">{error}</p>
        )}

        {!loading && !error && (
          <div className="service-list">
            {services.map(service => {
              const isActive = service.active_state === 'active'

              return (
                <div
                  className={`service-item service-item--${service.active_state}`}
                  key={service.unit}
                >
                  <div className="service-information">
                    <div className="service-title">
                      <strong>{service.name}</strong>
                      <span className="service-state">
                        {isActive ? 'Active' : service.active_state}
                        {isActive && (
                          <span className="service-status-dot" aria-hidden="true" />
                        )}
                      </span>
                    </div>
                    <small>{service.unit}</small>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}

export default Services