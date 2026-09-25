export type AppRole =
  | 'parent'
  | 'teacher'
  | 'special_educator'
  | 'therapist'
  | 'institute_admin'

export type Portal = 'parent' | 'staff' | 'admin'

export type Membership = {
  role: AppRole
  status: 'invited' | 'active' | 'suspended'
  institution_id: string
  institutions?: {
    name: string | null
  } | null
}
