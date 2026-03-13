package com.stockPlus.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/doc")
@RequiredArgsConstructor
@Slf4j
public class ApiDocController {

    /**
     * [v30.43] Python-Java Intelligence Bridge (Official Admin Path)
     * 지휘관님의 명령에 따라 정식 관리자 경로(/api/admin/doc)를 사수함.
     */
    @GetMapping("/scan")
    public String scanSystem(@RequestParam(required = false) String gitUrl) {
        log.info(">>> [Auto-Doc] Python Intelligence Bridge Activated. URL: {}", gitUrl);
        try {
            String scriptPath = "/app/collector/master_spec_generator.py";
            ProcessBuilder pb = new ProcessBuilder("python3", scriptPath, "--url", gitUrl != null ? gitUrl : "");
            pb.directory(new File("/app"));
            Process process = pb.start();

            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
                String result = reader.lines().collect(Collectors.joining("\n"));
                if (result.contains("{")) {
                    return result.substring(result.indexOf("{"));
                }
                return "{\"status\": \"ERROR\", \"message\": \"No JSON data found\"}";
            }
        } catch (Exception e) {
            log.error(">>> [Auto-Doc] Bridge Error", e);
            return "{\"status\": \"ERROR\", \"message\": \"" + e.getMessage() + "\"}";
        }
    }
}
