import baseAddressData from './addresses-by-name-mapper.json'

export const addressData = baseAddressData as unknown as Record<
  string,
  Record<
    string,
    Record<
      string,
      {
        province: string
        provinceCode: number
        district: string
        districtCode: number
        subDistrict: string
        subDistrictCode: number
        postCode: string
      }[]
    >
  >
>

export function getProvinces() {
  return Object.keys(addressData)
}

export function getDistrict(province: string) {
  if (!province) return []
  return Object.keys(addressData[province])
}

export function getSubDistrict(province: string, district: string) {
  if (!province || !district) return []
  return Object.keys(addressData[province][district])
}

export function getPostCode(province: string, district: string, subDistrict: string) {
  if (!province || !district || !subDistrict) return []
  return addressData[province][district][subDistrict].map((area) => area.postCode)
}
