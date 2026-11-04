import Foundation

/// Versioned, local-only JSON state. No provider response bodies are cached here.
final class LocalPersistence {
    let directory: URL
    let photosDirectory: URL
    private let stateURL: URL
    init(directory: URL? = nil) throws {
        let resolved:URL
        if let directory=directory { resolved=directory }
        else {
            let support=try FileManager.default.url(for:.applicationSupportDirectory,in:.userDomainMask,appropriateFor:nil,create:true)
            resolved=support.appendingPathComponent("Amstroll",isDirectory:true)
        }
        let photos=resolved.appendingPathComponent("JournalPhotos",isDirectory:true)
        self.directory=resolved
        photosDirectory=photos
        stateURL=resolved.appendingPathComponent("state-v1.json")
        try FileManager.default.createDirectory(at:photos,withIntermediateDirectories:true)
        #if os(iOS)
        try? FileManager.default.setAttributes([.protectionKey:FileProtectionType.completeUntilFirstUserAuthentication],ofItemAtPath:self.directory.path)
        #endif
    }
    func load() throws -> UserState {
        guard FileManager.default.fileExists(atPath:stateURL.path) else { return UserState() }
        let decoder=JSONDecoder();decoder.dateDecodingStrategy = .iso8601
        let result=try decoder.decode(UserState.self,from:Data(contentsOf:stateURL))
        guard result.version == 1 else { throw PlanningError.invalid("This saved-data version is not supported.") }
        return result
    }
    func preserveUnreadableState() throws {
        guard FileManager.default.fileExists(atPath:stateURL.path) else { return }
        try FileManager.default.copyItem(at:stateURL,to:directory.appendingPathComponent("state-unreadable-"+UUID().uuidString+".json"))
    }
    func save(_ state: UserState) throws {
        let encoder=JSONEncoder();encoder.dateEncodingStrategy = .iso8601;encoder.outputFormatting=[.sortedKeys]
        try encoder.encode(state).write(to:stateURL,options:.atomic)
    }
    func putPhoto(_ data: Data) throws -> String {
        guard !data.isEmpty,data.count<=8*1024*1024 else { throw PlanningError.invalid("Choose a photograph smaller than 8 MB.") }
        // The PhotosPicker import is normalised to JPEG by the interface before saving.
        let name=UUID().uuidString+".jpg"
        try data.write(to:photosDirectory.appendingPathComponent(name),options:.atomic)
        return name
    }
    func photoURL(_ name:String?) -> URL? {
        guard let name=name,!name.contains("/"),!name.contains("\\"),name.hasSuffix(".jpg") else { return nil }
        let url=photosDirectory.appendingPathComponent(name)
        return FileManager.default.fileExists(atPath:url.path) ? url : nil
    }
    func removePhoto(_ name:String?) {
        guard let url=photoURL(name) else { return };try? FileManager.default.removeItem(at:url)
    }
    func reset() throws {
        // Only direct journal files in this app-owned directory are removed.
        for url in try FileManager.default.contentsOfDirectory(at:photosDirectory,includingPropertiesForKeys:nil) { try FileManager.default.removeItem(at:url) }
        // Recovery backups contain user notes too; reset must remove those as well.
        for url in try FileManager.default.contentsOfDirectory(at:directory,includingPropertiesForKeys:[.isRegularFileKey]) where url.lastPathComponent.hasPrefix("state-unreadable-") && url.pathExtension == "json" {
            if try url.resourceValues(forKeys:[.isRegularFileKey]).isRegularFile == true { try FileManager.default.removeItem(at:url) }
        }
        try save(UserState())
    }
}
