/**
 * The vault is what makes a person's writing unreadable to us.
 *
 * Every value in these types was derived or wrapped in a browser. The server
 * stores them, hands them back, and can do nothing else with them: none of it
 * is enough to decrypt anything without the password or an enrolled passkey.
 */

/** How the password is stretched into key material. Stored per vault. */
export interface KdfParams {
  /** Base64. */
  salt: string;
  memoryKib: number;
  iterations: number;
  parallelism: number;
}

export interface Vault {
  kdf: "argon2id";
  params: KdfParams;
  /** Base64. Argon2id output under its own label, so it cannot yield the key. */
  verifier: string;
  /** Base64 of iv ‖ ciphertext: the data key under the password-derived key. */
  wrappedKey: string;
}

export interface VaultPasskey {
  /** Base64url, as WebAuthn spells credential ids. */
  credentialId: string;
  /** Base64. The input this credential's PRF is evaluated on. */
  prfSalt: string;
  /** Base64 of iv ‖ ciphertext: the same data key, under the PRF output. */
  wrappedKey: string;
  label: string;
  createdAt: string;
}

export interface VaultState {
  vault: Vault | null;
  passkeys: VaultPasskey[];
}

/** The vault as the agent stores it. */
export interface VaultEntity {
  kdf: string;
  kdf_salt: string;
  kdf_memory_kib: number;
  kdf_iterations: number;
  kdf_parallelism: number;
  verifier: string;
  wrapped_key: string;
}

export interface VaultPasskeyEntity {
  credential_id: string;
  prf_salt: string;
  wrapped_key: string;
  label: string;
  created_at: string;
}

export interface VaultStateEntity {
  vault: VaultEntity | null;
  passkeys: VaultPasskeyEntity[];
}

export function vaultFromEntity(entity: VaultEntity): Vault {
  return {
    kdf: "argon2id",
    params: {
      salt: entity.kdf_salt,
      memoryKib: entity.kdf_memory_kib,
      iterations: entity.kdf_iterations,
      parallelism: entity.kdf_parallelism,
    },
    verifier: entity.verifier,
    wrappedKey: entity.wrapped_key,
  };
}

export function vaultToEntity(vault: Vault): VaultEntity {
  return {
    kdf: vault.kdf,
    kdf_salt: vault.params.salt,
    kdf_memory_kib: vault.params.memoryKib,
    kdf_iterations: vault.params.iterations,
    kdf_parallelism: vault.params.parallelism,
    verifier: vault.verifier,
    wrapped_key: vault.wrappedKey,
  };
}

export function passkeyFromEntity(entity: VaultPasskeyEntity): VaultPasskey {
  return {
    credentialId: entity.credential_id,
    prfSalt: entity.prf_salt,
    wrappedKey: entity.wrapped_key,
    label: entity.label,
    createdAt: entity.created_at,
  };
}

export function stateFromEntity(entity: VaultStateEntity): VaultState {
  return {
    vault: entity.vault ? vaultFromEntity(entity.vault) : null,
    passkeys: entity.passkeys.map(passkeyFromEntity),
  };
}
