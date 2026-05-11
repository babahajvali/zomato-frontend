import { useQuery } from '@apollo/client'
import { GET_USER_ADDRESSES } from '../graphql/operations.js'

export default function AddressesPage() {
  const { data, loading, error } = useQuery(GET_USER_ADDRESSES)
  const addresses = data?.getUserAddress?.__typename === 'UserAddressesType'
    ? data.getUserAddress.addresses
    : []

  return (
    <>
      <h1 className="page-title">Saved addresses</h1>
      <p className="page-sub">
        Read-only — addresses are populated by admin scripts in this build.
      </p>

      {loading && <div className="empty"><span className="spinner" /></div>}
      {error && <div className="errbox">{error.message}</div>}
      {!loading && addresses.length === 0 && (
        <div className="empty">
          <div className="emoji">🏠</div>
          <div>No addresses saved yet.</div>
        </div>
      )}

      <div className="grid">
        {addresses.map((a) => (
          <div key={a.addressId} className="card card-pad">
            <div className="label-row" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>{a.label}</strong>
              {a.isDefault && <span className="tag">Default</span>}
            </div>
            <div style={{ marginTop: 6, color: 'var(--muted)', fontSize: 14 }}>
              {a.fullAddress}
              <br />
              {a.city} – {a.pincode}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
