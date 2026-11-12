import { describe, expect, it } from "vitest";
import { FetchRefused, checkTarget, privateIp, safeFetch, type Resolver, type Transport } from "@/lib/safe-fetch";

const resolveTo = (...ips: string[]): Resolver => async () => ips.map((address) => ({ address, family: address.includes(":") ? 6 : 4 }));

describe("privateIp", () => {
  it.each(["10.0.0.1", "127.0.0.1", "169.254.169.254", "172.16.0.1", "192.168.1.1", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1"])("%s is private", (ip) => expect(privateIp(ip)).toBe(true));
  it.each(["8.8.8.8", "1.1.1.1", "2606:4700::1111"])("%s is public", (ip) => expect(privateIp(ip)).toBe(false));
});

describe("checkTarget", () => {
  it("refuses other schemes, ports, credentials and local names", async () => {
    for (const u of ["ftp://a.com", "https://a.com:8080", "https://u:p@a.com", "http://localhost", "http://db.internal"]) {
      await expect(checkTarget(new URL(u), resolveTo("8.8.8.8"))).rejects.toBeInstanceOf(FetchRefused);
    }
  });
  it("refuses when any resolved address is private", async () => {
    await expect(checkTarget(new URL("https://a.com"), resolveTo("8.8.8.8", "10.0.0.5"))).rejects.toThrow("not on the public internet");
  });
  it("refuses literal private addresses without resolving", async () => {
    await expect(checkTarget(new URL("http://169.254.169.254/latest"), resolveTo("8.8.8.8"))).rejects.toBeInstanceOf(FetchRefused);
  });
  it("returns the one address to connect to", async () => {
    expect(await checkTarget(new URL("https://a.com"), resolveTo("8.8.8.8"))).toEqual({ address: "8.8.8.8", family: 4 });
  });
});

describe("safeFetch", () => {
  const ok = (body = "hi"): Transport => async () => ({ status: 200, location: null, contentType: "text/html", body: Buffer.from(body) });

  it("resolves once per hop and connects to that exact address (DNS rebinding, F-04)", async () => {
    let calls = 0;
    // A rebinding resolver: public the first time, private afterwards.
    const flipping: Resolver = async () => (calls++ === 0 ? [{ address: "8.8.8.8", family: 4 }] : [{ address: "127.0.0.1", family: 4 }]);
    const seen: string[] = [];
    const transport: Transport = async (_u, addr) => { seen.push(addr.address); return { status: 200, location: null, contentType: "text/html", body: Buffer.from("ok") }; };
    const res = await safeFetch("https://a.com", { resolve: flipping, transport });
    expect(res.body).toBe("ok");
    expect(seen).toEqual(["8.8.8.8"]);
    expect(calls).toBe(1);
  });

  it("re-checks every redirect and refuses one into the private network", async () => {
    const transport: Transport = async (u) =>
      u.hostname === "a.com" ? { status: 302, location: "http://internal-host/", contentType: "", body: Buffer.alloc(0) } : { status: 200, location: null, contentType: "text/html", body: Buffer.from("secret") };
    const resolve: Resolver = async (h) => [{ address: h === "a.com" ? "8.8.8.8" : "10.1.2.3", family: 4 }];
    await expect(safeFetch("https://a.com", { resolve, transport })).rejects.toThrow("not on the public internet");
  });

  it("gives up after too many redirects", async () => {
    const transport: Transport = async () => ({ status: 301, location: "/again", contentType: "", body: Buffer.alloc(0) });
    await expect(safeFetch("https://a.com", { resolve: resolveTo("8.8.8.8"), transport })).rejects.toThrow("Too many redirects");
  });

  it("returns the final URL and body", async () => {
    expect(await safeFetch("https://a.com/x", { resolve: resolveTo("8.8.8.8"), transport: ok("page") })).toMatchObject({ url: "https://a.com/x", status: 200, body: "page" });
  });
});
